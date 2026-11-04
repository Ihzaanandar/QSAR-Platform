import json
import re
import time
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional, Tuple

CHEMBL_API_BASE = "https://www.ebi.ac.uk/chembl/api/data"
DEFAULT_TIMEOUT = 25  # seconds
MAX_RETRIES = 3


def validate_chembl_target_id(target_id: str) -> bool:
    """Validate format of ChEMBL Target ID (e.g. CHEMBL2007625 or CHEMBL203)"""
    if not target_id:
        return False
    return bool(re.match(r"^CHEMBL\d+$", target_id.strip().upper()))


def _fetch_json(url: str, retries: int = MAX_RETRIES) -> Dict[str, Any]:
    """Helper to fetch JSON from URL with retry mechanism and User-Agent header."""
    headers = {
        "User-Agent": "QSAR-Platform/2.0 (Computational-Chemistry-Lab; contact: support@qsarplatform.org)",
        "Accept": "application/json"
    }
    req = urllib.request.Request(url, headers=headers)
    
    last_error = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as response:
                if response.status == 200:
                    raw_data = response.read().decode("utf-8")
                    return json.loads(raw_data)
                else:
                    raise urllib.error.HTTPError(url, response.status, f"HTTP Error {response.status}", response.headers, None)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            last_error = e
            time.sleep(1.0 * (attempt + 1))
            
    raise RuntimeError(f"ChEMBL API request failed after {retries} retries: {last_error}")


def get_target_details(target_chembl_id: str) -> Dict[str, Any]:
    """
    Fetch target metadata from ChEMBL:
    pref_name, organism, target_type, chembl_id.
    """
    clean_id = target_chembl_id.strip().upper()
    if not validate_chembl_target_id(clean_id):
        raise ValueError(f"Format Target ChEMBL ID tidak valid: '{target_chembl_id}'. Contoh valid: CHEMBL2007625")

    url = f"{CHEMBL_API_BASE}/target/{clean_id}.json"
    data = _fetch_json(url)

    target_name = data.get("pref_name") or data.get("target_chembl_id") or clean_id
    organism = data.get("organism") or "Unknown Organism"
    target_type = data.get("target_type") or "SINGLE PROTEIN"
    synonyms = [s.get("component_synonym") for s in data.get("target_components", [{}])[0].get("target_component_synonyms", []) if s.get("component_synonym")]

    return {
        "chembl_id": clean_id,
        "pref_name": target_name,
        "organism": organism,
        "target_type": target_type,
        "synonyms": synonyms[:5] if synonyms else []
    }


def fetch_target_bioactivities(
    target_chembl_id: str,
    standard_type: str = "IC50",
    max_records: int = 2500,
    progress_callback=None
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Fetch bioactivity records for a target with pagination and endpoint filtering.
    """
    clean_id = target_chembl_id.strip().upper()
    endpoint = standard_type.strip().upper()

    page_limit = 250
    offset = 0
    all_activities = []
    total_found_in_chembl = 0

    while len(all_activities) < max_records:
        url = (
            f"{CHEMBL_API_BASE}/activity.json"
            f"?target_chembl_id={clean_id}"
            f"&standard_type={endpoint}"
            f"&limit={page_limit}"
            f"&offset={offset}"
        )

        try:
            res = _fetch_json(url)
        except Exception as e:
            if not all_activities:
                raise RuntimeError(f"Gagal mengambil data bioaktivitas dari ChEMBL: {e}")
            break

        page_meta = res.get("page_meta", {})
        total_found_in_chembl = page_meta.get("total_count", total_found_in_chembl)
        activities = res.get("activities", [])

        if not activities:
            break

        for act in activities:
            smiles = act.get("canonical_smiles")
            val = act.get("standard_value")
            relation = act.get("standard_relation")
            units = act.get("standard_units")
            mol_id = act.get("molecule_chembl_id") or act.get("assay_chembl_id")

            if smiles and val is not None:
                all_activities.append({
                    "molecule_chembl_id": mol_id,
                    "canonical_smiles": smiles,
                    "standard_type": act.get("standard_type") or endpoint,
                    "standard_relation": relation or "=",
                    "standard_value": float(val) if val is not None else None,
                    "standard_units": units or "nM",
                    "pchembl_value": act.get("pchembl_value"),
                    "assay_description": act.get("assay_description") or "",
                    "data_validity_comment": act.get("data_validity_comment") or "",
                    "potential_duplicate": act.get("potential_duplicate", 0)
                })

        offset += len(activities)

        if progress_callback:
            progress_callback(min(len(all_activities), max_records), total_found_in_chembl)

        if offset >= total_found_in_chembl or len(activities) < page_limit:
            break

        # Respect ChEMBL rate limits
        time.sleep(0.15)

    summary = {
        "chembl_target_id": clean_id,
        "standard_type": endpoint,
        "total_available_in_chembl": total_found_in_chembl,
        "total_downloaded": len(all_activities),
        "fetched_records_count": len(all_activities)
    }

    return all_activities, summary

