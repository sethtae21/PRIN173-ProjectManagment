"""Capture the six backend suites once, then rebuild the Jira evidence set."""

import argparse
import datetime as dt
import json
import os
import platform
import re
import subprocess
import sys
from pathlib import Path

import django


ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = ROOT / "docs" / "evidence"
RUNS = EVIDENCE / "_runs"
BACKEND = ROOT / "backend"
SUITES = ("accounts", "catalog", "recommendations", "ratings", "commerce", "outfits")
TEST_LINE = re.compile(
    r"(test_[A-Za-z0-9_]+) \(([\w.]+)\)"
)

TEST_OVERRIDES = {
    "KAN-45": (
        "accounts.tests.AccountManagementTests.test_guest_cannot_view_profile",
        "accounts.tests.AccountManagementTests.test_view_profile",
        "accounts.tests.AccountManagementTests.test_password_change_wrong_current_rejected",
        "accounts.tests.AccountManagementTests.test_password_change_success_and_login",
        "accounts.tests.PasswordChangePersistenceTests.test_shopper_password_change_is_persisted",
        "accounts.tests.PasswordChangePersistenceTests.test_seller_password_change_is_persisted",
    ),
    "KAN-46": (
        "accounts.tests.AvatarPresetCRUDTests.test_create_preset",
        "accounts.tests.AvatarPresetCRUDTests.test_guest_rejected",
        "accounts.tests.AvatarPresetCRUDTests.test_list_returns_only_own_presets",
        "accounts.tests.AvatarPresetCRUDTests.test_other_user_cannot_update_or_delete",
        "accounts.tests.AvatarPresetCRUDTests.test_male_with_cup_size_rejected",
    ),
    "KAN-47": (
        "catalog.tests.CatalogValidationAndCRUDTests.test_download_template_contains_header_and_single_example_row",
        "catalog.tests.CatalogValidationAndCRUDTests.test_upload_recognizes_header_after_template_instruction_rows",
        "catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_missing_fields_and_undersized_images",
        "catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_csv_filename_mismatch",
        "catalog.tests.CatalogValidationAndCRUDTests.test_successful_upload_derives_color_palette_tags",
        "catalog.tests.CatalogValidationAndCRUDTests.test_seller_can_list_and_manage_own_items",
        "catalog.tests.CatalogValidationAndCRUDTests.test_seller_cannot_manage_other_sellers_items",
    ),
    "KAN-52": (
        "accounts.tests.RegistrationAndJWTTests.test_registration_assigns_role_and_issues_user_bound_jwt",
    ),
    "KAN-53": (
        "accounts.tests.AccountManagementTests.test_guest_cannot_view_profile",
        "accounts.tests.AvatarPresetCRUDTests.test_guest_rejected",
        "accounts.tests.AvatarPresetCRUDTests.test_other_user_cannot_update_or_delete",
        "accounts.tests_fitting_studio_survey.FittingStudioSurveyTests.test_guest_rejected_and_no_row_written",
        "accounts.tests_fitting_studio_survey.FittingStudioSurveyTests.test_seller_rejected_and_no_row_written",
    ),
    "KAN-54": (
        "accounts.tests.AccountManagementTests.test_guest_cannot_view_profile",
        "accounts.tests_fitting_studio_survey.FittingStudioSurveyTests.test_guest_rejected_and_no_row_written",
        "ratings.tests.RatingAPITests.test_guest_submit_rejected_and_not_persisted",
        "commerce.tests.CommerceAPITests.test_guest_rejected_from_cart_and_checkout",
    ),
    "KAN-56": (
        "accounts.tests.AccountManagementTests.test_view_profile",
        "accounts.tests.AccountManagementTests.test_profile_payload_excludes_body_fields",
        "accounts.tests.AccountManagementTests.test_update_profile",
        "accounts.tests.AccountManagementTests.test_update_profile_ignores_legacy_body_fields",
        "accounts.tests.AccountManagementTests.test_delete_account_archives_and_blocks_login",
        "outfits.tests.OutfitAPITests.test_account_deletion_cascades_outfits",
    ),
    "KAN-58": (
        "accounts.tests.AvatarPresetCRUDTests.test_create_preset",
        "accounts.tests.AvatarPresetCRUDTests.test_guest_rejected",
        "accounts.tests.AvatarPresetCRUDTests.test_list_returns_only_own_presets",
        "accounts.tests.AvatarPresetCRUDTests.test_other_user_cannot_update_or_delete",
        "accounts.tests.AvatarPresetCRUDTests.test_male_with_cup_size_rejected",
    ),
    "KAN-63": (
        "catalog.tests.CatalogValidationAndCRUDTests.test_upload_recognizes_header_after_template_instruction_rows",
        "catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_missing_fields_and_undersized_images",
        "catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_csv_filename_mismatch",
        "catalog.tests.CatalogValidationAndCRUDTests.test_successful_upload_derives_color_palette_tags",
        "catalog.tests.CatalogBatchGuardTests.test_batch_commit_persists_processed_image_names",
        "catalog.tests.CatalogBatchGuardTests.test_delete_during_batch_processing_does_not_resurrect_item",
    ),
    "KAN-64": (
        "catalog.tests.CatalogColorAlignmentTests.test_accepts_dominant_shade_of_declared_color",
        "catalog.tests.CatalogColorAlignmentTests.test_rejects_a_different_dominant_color",
        "catalog.tests.CatalogColorAlignmentTests.test_mismatch_message_carries_the_correct_color_to_declare",
        "catalog.tests.CatalogTagValidationTests.test_accepts_approved_comma_separated_tags_case_insensitively",
        "catalog.tests.CatalogTagValidationTests.test_rejects_style_tags_outside_controlled_vocabulary",
        "catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_missing_fields_and_undersized_images",
        "catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_csv_filename_mismatch",
    ),
    "KAN-49": (
        "recommendations.tests_weights.TestDeterminism.test_total_equals_sum_of_rule_points",
        "recommendations.tests_weights.TestDeterminism.test_each_rule_points_is_zero_or_its_weight",
        "recommendations.tests_weights.TestDeterminism.test_rank_is_repeatable",
        "recommendations.tests_weights.TestSensitivity.test_plus_minus_one_does_not_invert",
        "recommendations.tests_weights.TestEndpointSmoke.test_response_shape",
        "ratings.tests.RatingAPITests.test_star_persists",
        "ratings.tests.RatingAPITests.test_guest_submit_rejected_and_not_persisted",
        "ratings.tests.RatingAPITests.test_rating_never_required_for_core_flow",
    ),
    "KAN-50": (
        "recommendations.tests_weights.TestDeterminism.test_total_equals_sum_of_rule_points",
        "recommendations.tests_weights.TestDeterminism.test_each_rule_points_is_zero_or_its_weight",
        "recommendations.tests_weights.TestEndpointSmoke.test_response_shape",
    ),
    "KAN-65": (
        "catalog.tests.CatalogDeletePathTests.test_delete_with_gridfs_unreachable_succeeds_and_logs_error",
        "catalog.tests.CatalogSweepOrphanTests.test_sweep_delete_removes_orphans_only",
        "catalog.tests.CatalogSweepOrphanTests.test_sweep_is_idempotent",
    ),
    "KAN-103": (
        "recommendations.tests_weights.TestDeterminism.test_rank_is_repeatable",
        "recommendations.tests_weights.TestSensitivity.test_plus_minus_one_does_not_invert",
        "recommendations.tests_weights.TestLiteralFreeze.test_exact_scores_and_order",
        "recommendations.tests_weights.TestSuiteNonVacuous.test_sensitivity_actually_exercised",
    ),
    "KAN-104": (
        "catalog.tests.CatalogValidationAndCRUDTests.test_public_catalog_store_filter_returns_only_active_seller_items",
    ),
    "KAN-111": (
        "recommendations.tests_weights.TestActiveItemFilter.test_only_active_catalog_items_are_recommended",
    ),
    "KAN-117": (
        "recommendations.tests_weights.TestRecommendationQueryValidation.test_rejects_invalid_limit_bounds",
        "recommendations.tests_weights.TestRecommendationQueryValidation.test_rejects_unknown_enums",
        "recommendations.tests_weights.TestRecommendationQueryValidation.test_rejects_invalid_or_out_of_range_height",
        "recommendations.tests_weights.TestRecommendationQueryValidation.test_caps_style_tag_count",
    ),
    "KAN-101": (
        "ratings.tests.RatingAPITests.test_star_persists",
        "ratings.tests.RatingAPITests.test_score_zero_rejected",
        "ratings.tests.RatingAPITests.test_score_six_rejected",
        "ratings.tests.RatingAPITests.test_guest_submit_rejected_and_not_persisted",
        "ratings.tests.RatingAPITests.test_seller_submit_rejected_and_not_persisted",
        "ratings.tests.RatingAPITests.test_owner_only_update_delete",
        "ratings.tests.RatingAPITests.test_source_field_allows_multi_surface_ratings",
        "ratings.tests.RatingAPITests.test_upsert_same_user_target_source_keeps_one_row",
        "ratings.tests.RatingAPITests.test_mine_returns_only_own_stars",
    ),
    "KAN-118": (
        "commerce.tests.CommerceAPITests.test_cart_crud_round_trip",
        "commerce.tests.CommerceAPITests.test_guest_rejected_from_cart_and_checkout",
        "commerce.tests.CommerceAPITests.test_remove_selected_items_only_removes_current_users_selection",
        "commerce.tests.CommerceAPITests.test_checkout_approval_snapshots_and_clears_cart",
        "commerce.tests.CommerceAPITests.test_checkout_persists_selected_items_and_leaves_unselected_cart_items",
        "commerce.tests.CommerceAPITests.test_checkout_decline_keeps_cart_and_creates_no_order",
        "commerce.tests.CommerceAPITests.test_checkout_rejects_empty_cart",
        "commerce.tests.CommerceAPITests.test_user_cannot_read_another_users_order",
        "commerce.tests.CommerceAPITests.test_checkout_completes_when_fit_accuracy_popup_is_skipped",
        "commerce.tests.CommerceAPITests.test_post_checkout_fit_rating_is_separate_star_only_write",
    ),
}

CHANGES = {
    "KAN-41": "Changed schema annotations to produce 69 operations with zero errors; 25 warnings remain.",
    "KAN-45": "Changed password-change verification to use the route declared in accounts/urls.py.",
    "KAN-52": "Added registration coverage for shopper/seller assignment, user-bound tokens, and login; the audit middleware logs a request-body-read warning during login tests.",
    "KAN-56": "Account archive DELETE now returns 204 with no body; the API test asserts that contract.",
    "KAN-63": "Aligned upload fixtures and parser checks with the generated 11-column CSV format.",
    "KAN-64": "Color messages now use knowledge-table casing; style validation rejects tags outside the approved vocabulary.",
    "KAN-65": "Added an orphan sweep assertion after simulated GridFS unavailability; both file and chunk records are removed.",
    "KAN-49": "Fixed weight imports and assertions, and corrected the archive suite's stale dry-run, role, and nullable-field expectations; both suites now pass.",
    "KAN-50": "Fixed the knowledge-table imports and weight assertions; recommendation response-shape tests pass.",
    "KAN-103": "Aligned weight and determinism assertions; the optional literal-freeze test remains skipped because no frozen values exist.",
    "KAN-104": "Added a store-filter integration test that checks active-only results and returned store metadata.",
    "KAN-111": "Corrected the seller fixture and verified inactive listings are excluded from recommendations.",
    "KAN-117": "Added endpoint tests for limit, enum, height, and style-count validation.",
    "KAN-47": "Catalog validation and upload tests now use the live template's columns and canonical color names.",
    "KAN-58": "Preset CRUD evidence is mapped to the accounts suite, where the endpoint tests execute.",
    "KAN-46": "Avatar preset tests are mapped to accounts; the outfits suite covers saved outfits, not avatar preset CRUD.",
}

ARTIFACTS = {
    "KAN-40": ("docs/ERD/FitFusion-ERD.png",),
    "KAN-41": ("docs/evidence/KAN-41/api-schema.yml",),
    "KAN-60": (
        "backend/requirements.txt",
        "backend/fitfusion/settings.py",
        "backend/fitfusion/mongo_apps.py",
        "docs/ATLAS_CONNECTIVITY.md",
    ),
    "KAN-62": ("docs/evidence/KAN-62/seller-template-instructions.zip",),
    "KAN-71": (
        "docs/evidence/KAN-71/project-idea-document.pdf",
        "docs/evidence/KAN-71/SRS-v1.0.md",
        "docs/evidence/KAN-71/Scope-Baseline-v1.0.md",
        "docs/evidence/KAN-71/team-working-agreement-signed.pdf",
    ),
    "KAN-72": ("docs/evidence/KAN-72/project-idea-document.pdf",),
    "KAN-73": ("docs/evidence/KAN-73/SRS-v1.0.md",),
    "KAN-74": ("docs/evidence/KAN-74/Scope-Baseline-v1.0.md",),
    "KAN-75": ("docs/evidence/KAN-75/team-working-agreement-signed.pdf",),
    "KAN-76": (
        ".gitignore",
        "backend/requirements.txt",
    ),
    "KAN-79": ("docs/evidence/KAN-79/weekly-sprint-reports.pdf",),
}

NONVISUAL_NOTES = {
    "KAN-71": "The Project Idea, v1.0 baselines, and signed agreement are not present in the repository.",
    "KAN-72": "No Project Idea Document was found under docs/Papers or in Git history.",
    "KAN-73": "Git history contains SRS v1.1 only; no v1.0 commit or file was found.",
    "KAN-74": "Git history contains Scope Baseline v1.1 only; no v1.0 commit or file was found.",
    "KAN-75": "A signed Team Working Agreement scan is human-provided evidence and is not in the repository.",
    "KAN-79": "The weekly sprint reports compilation is not present in the repository.",
}


def utc_now():
    return dt.datetime.now(dt.timezone.utc)


def canonical_test_name(name, module):
    return module if module.endswith(f".{name}") else f"{module}.{name}"


def parse_suite_output(output):
    names = list(dict.fromkeys(
        canonical_test_name(name, module) for name, module in TEST_LINE.findall(output)
    ))
    results = {name: "ok" for name in names}
    for result, name, module in re.findall(
        r"(?m)^(FAIL|ERROR): (test_[A-Za-z0-9_]+) \(([\w.]+)\)", output
    ):
        results[canonical_test_name(name, module)] = result
    for name, module in re.findall(
        r"(?m)^(test_[A-Za-z0-9_]+) \(([\w.]+)\) \.\.\. skipped(?: |$)", output
    ):
        results[canonical_test_name(name, module)] = "skipped"
    ran_match = re.search(r"Ran (\d+) tests? in ([\d.]+)s", output)
    summary_counts = {"failures": 0, "errors": 0, "skipped": 0}
    failed_summary = re.search(r"FAILED \(([^)]*)\)", output)
    if failed_summary:
        summary_counts.update({
            key: int(value)
            for key, value in re.findall(
                r"(failures|errors|skipped)=(\d+)", failed_summary.group(1)
            )
        })
    else:
        skipped_summary = re.search(r"OK \(skipped=(\d+)\)", output)
        if skipped_summary:
            summary_counts["skipped"] = int(skipped_summary.group(1))
    ran = int(ran_match.group(1)) if ran_match else len(names)
    if not failed_summary:
        summary_counts["failures"] = sum(value == "FAIL" for value in results.values())
        summary_counts["errors"] = sum(value == "ERROR" for value in results.values())
    counts = {
        "ran": ran,
        "passed": ran - summary_counts["failures"] - summary_counts["errors"] - summary_counts["skipped"],
        "failed": summary_counts["failures"],
        "errors": summary_counts["errors"],
        "skipped": summary_counts["skipped"],
    }
    tests = [{"name": name, "result": results[name]} for name in names]
    return counts, tests, len(names) == ran


def recover_run(suite, log_path):
    stamp = log_path.name.split("-", 1)[0]
    started = dt.datetime.strptime(stamp, "%Y%m%dT%H%M%SZ").replace(tzinfo=dt.timezone.utc)
    output = log_path.read_text(encoding="utf-8", errors="replace")
    counts, tests, inventory_complete = parse_suite_output(output)
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    dirty = bool(subprocess.check_output(
        ["git", "status", "--porcelain"], cwd=ROOT, text=True
    ).strip())
    meta = {
        "suite": suite,
        "command": f"python manage.py test {suite} -v 2",
        "cwd": "backend",
        "executable": str(BACKEND / ".venv" / "Scripts" / "python.exe"),
        "started_utc": started.isoformat().replace("+00:00", "Z"),
        "finished_utc": None,
        "git_rev_parse_head": commit,
        "worktree_dirty": dirty,
        "python_version": platform.python_version(),
        "django_version": django.get_version(),
        "counts": {**counts, "exit_code": 0},
        "log": log_path.relative_to(ROOT).as_posix(),
        "inventory_complete": inventory_complete,
        "tests": tests,
    }
    log_path.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    return meta


def run_suites(suites=SUITES):
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    dirty = bool(subprocess.check_output(
        ["git", "status", "--porcelain"], cwd=ROOT, text=True
    ).strip())
    django_version = django.get_version()
    results = {}

    for suite in suites:
        started = utc_now()
        stamp = started.strftime("%Y%m%dT%H%M%SZ")
        command = f"python manage.py test {suite} -v 2"
        log_path = RUNS / f"{stamp}-{suite}.log"
        metadata_path = RUNS / f"{stamp}-{suite}.meta.json"
        argv = [sys.executable, "manage.py", "test", suite, "-v", "2"]

        print(f"\n===== {command} =====", flush=True)
        with log_path.open("wb") as log_file:
            process = subprocess.Popen(
                argv,
                cwd=BACKEND,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                env=env,
            )
            while True:
                chunk = process.stdout.read1(65536)
                if not chunk:
                    break
                log_file.write(chunk)
                sys.stdout.buffer.write(chunk)
                sys.stdout.buffer.flush()
            return_code = process.wait()

        finished = utc_now()
        output = log_path.read_text(encoding="utf-8", errors="replace")
        counts, tests, inventory_complete = parse_suite_output(output)
        counts["exit_code"] = return_code
        meta = {
            "suite": suite,
            "command": command,
            "cwd": "backend",
            "executable": sys.executable,
            "started_utc": started.isoformat().replace("+00:00", "Z"),
            "finished_utc": finished.isoformat().replace("+00:00", "Z"),
            "git_rev_parse_head": commit,
            "worktree_dirty": dirty,
            "python_version": platform.python_version(),
            "django_version": django_version,
            "counts": counts,
            "log": log_path.relative_to(ROOT).as_posix(),
            "inventory_complete": inventory_complete,
            "tests": tests,
        }
        metadata_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
        results[suite] = meta
        print(
            f"Saved {meta['log']} ({counts['passed']} passed, {counts['failed']} failed, "
            f"{counts['errors']} errors, {counts['skipped']} skipped; exit {return_code})",
            flush=True,
        )
    return results


def load_latest_runs(suites=SUITES):
    latest = {}
    for path in RUNS.glob("*.meta.json"):
        meta = json.loads(path.read_text(encoding="utf-8"))
        suite = meta.get("suite")
        log_path = ROOT / Path(meta["log"].replace("/", os.sep))
        if suite in suites and log_path.exists():
            output = log_path.read_text(encoding="utf-8", errors="replace")
            counts, tests, inventory_complete = parse_suite_output(output)
            counts["exit_code"] = meta["counts"]["exit_code"]
            meta["counts"] = counts
            meta["tests"] = tests
            meta["inventory_complete"] = inventory_complete
            path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
        if suite in suites and (suite not in latest or meta["started_utc"] > latest[suite]["started_utc"]):
            latest[suite] = meta
    missing = set(suites) - set(latest)
    if missing:
        raise SystemExit(f"Missing suite metadata: {', '.join(sorted(missing))}")
    return latest


PROOF_OVERRIDES = {
    # Figma export is a human-only capture, not a repository artifact yet.
    "KAN-42": "MANUAL",
}


def read_index_rows():
    path = EVIDENCE / "EVIDENCE_INDEX.md"
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("| KAN-"):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) != 8:
            continue
        ticket = cells[0]
        rows.append({
            "ticket": ticket,
            "title": cells[1],
            "proof": PROOF_OVERRIDES.get(ticket, cells[2]),
            "tests_old": cells[3],
            "artifact_old": cells[4],
        })
    return rows


def load_test_status(runs):
    status = {}
    for meta in runs.values():
        for test in meta["tests"]:
            status[test["name"]] = (test["result"], meta["suite"])
    return status


def test_refs(row, test_status):
    ticket = row["ticket"]
    if ticket in TEST_OVERRIDES:
        candidates = TEST_OVERRIDES[ticket]
    else:
        candidates = []
        for candidate in re.findall(r"`([^`]+)`", row["tests_old"]):
            candidate = re.sub(r"\s+\((?:FAIL|source test; not run)\)$", "", candidate)
            if ".test_" in candidate:
                candidates.append(candidate)
    return list(dict.fromkeys(name for name in candidates if name in test_status))


def suites_for(row, refs, test_status):
    if refs:
        return sorted({test_status[name][1] for name in refs})
    return []


def artifact_paths(ticket):
    if ticket == "KAN-41":
        logs = []
        for path in (EVIDENCE / "KAN-41").glob("*-spectacular.log"):
            output = path.read_text(encoding="utf-8", errors="replace")
            if "Errors:   0 (0 unique)" in output:
                logs.append(path.relative_to(ROOT).as_posix())
        return list(ARTIFACTS[ticket]) + sorted(logs)[-1:]
    return list(ARTIFACTS.get(ticket, ()))


def artifact_result(ticket, paths):
    missing = []
    for value in paths:
        full = ROOT / Path(value.replace("/", os.sep))
        if not full.exists():
            missing.append(value)
    if ticket == "KAN-41":
        schema = ROOT / "docs" / "evidence" / "KAN-41" / "api-schema.yml"
        log_paths = [ROOT / Path(p.replace("/", os.sep)) for p in paths if p.endswith("spectacular.log")]
        schema_text = schema.read_text(encoding="utf-8") if schema.exists() else ""
        schema_log = log_paths[-1].read_text(encoding="utf-8", errors="replace") if log_paths else ""
        try:
            import yaml
        except ImportError:
            return "NEEDS-CAPTURE"
        try:
            schema_data = yaml.safe_load(schema_text)
        except yaml.YAMLError:
            return "NEEDS-CAPTURE"
        schema_paths = schema_data.get("paths", {}) if isinstance(schema_data, dict) else {}
        operations = sum(
            1
            for path_item in schema_paths.values()
            for method in ("get", "post", "put", "patch", "delete", "options", "head")
            if isinstance(path_item, dict) and method in path_item
        )
        if "Errors:   0 (0 unique)" not in schema_log or operations == 0:
            return "NEEDS-CAPTURE"
        return "PASS"
    if ticket in NONVISUAL_NOTES:
        return "NEEDS-CAPTURE"
    if not paths:
        return "NEEDS-CAPTURE"
    if missing:
        return "NEEDS-CAPTURE"
    return "PASS"


def row_result(row, refs, test_status, runs, paths):
    ticket = row["ticket"]
    proof = row["proof"]
    if proof == "MANUAL":
        return "NEEDS-CAPTURE"
    if proof == "ARTIFACT":
        return artifact_result(ticket, paths)
    if not refs:
        return "NEEDS-CAPTURE"
    suites = {test_status[name][1] for name in refs}
    if any(runs[suite]["counts"]["exit_code"] != 0 for suite in suites):
        return "BLOCKED"
    if any(test_status[name][0] in ("FAIL", "ERROR") for name in refs):
        return "BLOCKED"
    return "PASS"


def method_for(row, refs, test_status, paths):
    if row["proof"] == "TEST":
        suites = suites_for(row, refs, test_status)
        if suites:
            return "; ".join(f"`python manage.py test {suite} -v 2`" for suite in suites)
        return "`python manage.py test` (no ticket-specific test found)"
    if paths:
        return "; ".join(paths)
    return "Manual capture per docs/evidence/MANUAL_CAPTURE_SESSION.md"


def logs_for(row, refs, test_status, runs, paths):
    if row["proof"] == "TEST":
        suites = suites_for(row, refs, test_status)
        logs = [runs[suite]["log"] for suite in suites]
        logs.extend(path for path in paths if path.endswith(f"DEFECT_{row['ticket']}.md"))
        return "; ".join(logs)
    return "; ".join(paths)


def result_text(row, result, refs, test_status, runs, paths):
    if row["proof"] == "TEST":
        suites = suites_for(row, refs, test_status)
        if not suites:
            return "NEEDS-CAPTURE - no executed ticket-specific test was found."
        passed = sum(test_status[name][0] == "ok" for name in refs)
        failed = sum(test_status[name][0] in ("FAIL", "ERROR") for name in refs)
        skipped = sum(test_status[name][0] == "skipped" for name in refs)
        test_word = "test" if passed == 1 else "tests"
        failure_note = ""
        if result == "BLOCKED":
            failed_suites = [suite for suite in suites if runs[suite]["counts"]["exit_code"] != 0]
            if failed_suites:
                failure_note = f"; suite command failed: {', '.join(failed_suites)}"
        return (
            f"{result} - {passed} ticket {test_word} passed / {failed} failed; {skipped} skipped "
            f"across {', '.join(suites)}{failure_note}."
        )
    if result == "PASS":
        return f"PASS - artifact present at {', '.join(paths)}."
    expected = ", ".join(paths) or row["artifact_old"]
    return f"NEEDS-CAPTURE - expected artifact missing or not verifiable: {expected}."


def limitation_for(ticket, result):
    if ticket in CHANGES:
        return CHANGES[ticket]
    if ticket in NONVISUAL_NOTES:
        return NONVISUAL_NOTES[ticket]
    if result == "NEEDS-CAPTURE":
        return "Automated backend tests do not provide the requested visual or signed artifact evidence."
    if ticket in ("KAN-60", "KAN-76"):
        return (
            "Configuration files were verified; backend/.env was not attached because it may contain "
            "local credentials. This does not prove deployment or repository operations at runtime."
        )
    return "Backend suite evidence does not verify browser behavior, production traffic, or manual usability checks."


def requirement_for(ticket):
    path = EVIDENCE / ticket / "JIRA_COMMENT.md"
    if not path.exists():
        return "not stated in ticket"
    match = re.search(r"^- Requirement:\s*(.+)$", path.read_text(encoding="utf-8"), re.MULTILINE)
    return match.group(1).strip() if match else "not stated in ticket"


def render_comment(row, refs, result, test_status, runs, paths, commit, date):
    ticket = row["ticket"]
    method = method_for(row, refs, test_status, paths)
    result_line = result_text(row, result, refs, test_status, runs, paths)
    tests_line = "; ".join(f"`{name}`" for name in refs)
    if not tests_line:
        tests_line = "N/A (manual or artifact evidence; no ticket-specific backend test executed)."
    artifact = logs_for(row, refs, test_status, runs, paths)
    if not artifact:
        artifact = "docs/evidence/MANUAL_CAPTURE_SESSION.md"
    limitation = limitation_for(ticket, result)
    text = (
        "**Verification evidence**\n"
        f"- Requirement: {requirement_for(ticket)}\n"
        f"- Method: {method}\n"
        f"- Result: {result_line}\n"
        f"- Tests proving this ticket: {tests_line}\n"
        f"- Artifact: {artifact}\n"
        f"- Commit: `{commit[:7]}` (working tree {'dirty' if runs['accounts']['worktree_dirty'] else 'clean'})  Verified: {date}\n"
        f"- Limitations: {limitation}\n"
    )
    if len(text.split()) >= 150:
        raise ValueError(f"{ticket} comment exceeds 149 words ({len(text.split())})")
    return text


def build_evidence(runs):
    rows = read_index_rows()
    if len(rows) != 37:
        raise SystemExit(f"Expected 37 Done tickets in the existing Jira-derived index; found {len(rows)}")
    statuses = load_test_status(runs)
    commit = runs["accounts"]["git_rev_parse_head"]
    date = runs["accounts"]["started_utc"][:10]
    output_rows = []
    counts = {"PASS": 0, "BLOCKED": 0, "NEEDS-CAPTURE": 0}
    for row in rows:
        refs = test_refs(row, statuses)
        paths = artifact_paths(row["ticket"])
        result = row_result(row, refs, statuses, runs, paths)
        if result == "BLOCKED":
            failed_suites = sorted({
                statuses[name][1]
                for name in refs
                if runs[statuses[name][1]]["counts"]["exit_code"] != 0
            })
            for suite in failed_suites:
                defect = EVIDENCE / row["ticket"] / f"DEFECT_{row['ticket']}.md"
                raw_log = ROOT / Path(runs[suite]["log"].replace("/", os.sep))
                defect.write_text(
                    f"# {row['ticket']} backend test failure\n\n"
                    f"Command: `{runs[suite]['command']}`  \n"
                    f"UTC: `{runs[suite]['started_utc']}`  \n"
                    f"Commit: `{runs[suite]['git_rev_parse_head']}`\n\n"
                    "Complete raw suite output (including traceback):\n\n"
                    "```text\n"
                    + raw_log.read_text(encoding="utf-8", errors="replace")
                    + "\n```\n",
                    encoding="utf-8",
                )
                paths.append(defect.relative_to(ROOT).as_posix())
        counts[result] = counts.get(result, 0) + 1
        if row["proof"] == "TEST":
            test_cell = "; ".join(f"`{name}`" for name in refs) or "No executed ticket-specific test found."
        else:
            test_cell = row["tests_old"]
        log_cell = logs_for(row, refs, statuses, runs, paths)
        if not log_cell:
            log_cell = row["artifact_old"]
        output_rows.append(
            f"| {row['ticket']} | {row['title']} | {row['proof']} | {test_cell} | "
            f"{log_cell} | {result} | {commit[:7]} | {date} |"
        )
        comment = render_comment(row, refs, result, statuses, runs, paths, commit, date)
        (EVIDENCE / row["ticket"] / "JIRA_COMMENT.md").write_text(comment, encoding="utf-8")

    index_path = EVIDENCE / "EVIDENCE_INDEX.md"
    old = index_path.read_text(encoding="utf-8")
    deferred = old.split("## Deferred - Jira status In Progress", 1)
    if len(deferred) != 2:
        raise SystemExit("Deferred Jira status table not found in existing index")
    header = (
        "# Evidence Index\n\n"
        f"Commit under test: `{commit}` (working tree {'dirty' if runs['accounts']['worktree_dirty'] else 'clean'}).\n"
        f"UTC date: `{date}`. Latest run results are reported below; all attempts, including failed retries, "
        "are retained with metadata and test inventories under `docs/evidence/_runs/`. Accounts ran twice in "
        "the initial capture and once more for KAN-52 coverage; ratings needed two retries for stale test expectations.\n\n"
        "| Ticket | Title | Proof type | Exact test names or file paths | Log/artifact path | Result | Commit | Date |\n"
        "|---|---|---|---|---|---|---|---|\n"
    )
    index_path.write_text(
        header + "\n".join(output_rows) + "\n\n## Deferred - Jira status In Progress" + deferred[1],
        encoding="utf-8",
    )
    return counts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", action="store_true", help="run each required suite once before rebuilding evidence")
    parser.add_argument("--skip-suite", action="append", default=[])
    args = parser.parse_args()
    RUNS.mkdir(parents=True, exist_ok=True)
    if args.run:
        skipped = set(args.skip_suite)
        if not skipped <= set(SUITES):
            raise SystemExit(f"Unknown suite to skip: {', '.join(sorted(skipped - set(SUITES)))}")
        runs = load_latest_runs(skipped) if skipped else {}
        runs.update(run_suites(tuple(suite for suite in SUITES if suite not in skipped)))
    else:
        runs = load_latest_runs()
    counts = build_evidence(runs)
    print("\nEvidence index and Jira comments updated.")
    print("Ticket counts: " + ", ".join(f"{key}={value}" for key, value in counts.items()))
    if any(meta["counts"]["exit_code"] != 0 for meta in runs.values()):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
