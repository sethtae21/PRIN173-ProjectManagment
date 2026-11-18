#!/usr/bin/env python3
"""Post PASS evidence comments and artifacts to Jira."""

import argparse
import os
import re
import sys
import time
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parent.parent
INDEX_PATH = ROOT / "docs" / "evidence" / "EVIDENCE_INDEX.md"
LOG_PATH = ROOT / "docs" / "evidence" / "_runs" / "jira_upload.log"
REQUEST_INTERVAL = 0.5


def parse_evidence_index():
    lines = INDEX_PATH.read_text(encoding="utf-8").splitlines()
    header_index = next(
        (i for i, line in enumerate(lines) if line.startswith("| Ticket |")),
        None,
    )
    if header_index is None:
        raise ValueError(f"Evidence table header not found in {INDEX_PATH}")

    headers = [value.strip() for value in lines[header_index].strip("|").split("|")]
    try:
        ticket_column = headers.index("Ticket")
        result_column = headers.index("Result")
    except ValueError as exc:
        raise ValueError("Evidence table must contain Ticket and Result columns") from exc

    passing_tickets = []
    todo_items = []
    for line in lines[header_index + 1 :]:
        if not line.startswith("|"):
            if passing_tickets or todo_items:
                break
            continue
        columns = [value.strip() for value in line.strip("|").split("|")]
        if len(columns) <= max(ticket_column, result_column):
            continue
        ticket = columns[ticket_column]
        result = columns[result_column]
        if not re.fullmatch(r"KAN-\d+", ticket):
            continue
        if result == "PASS":
            passing_tickets.append(ticket)
        elif result in {"NEEDS-CAPTURE", "BLOCKED"}:
            todo_items.append((ticket, result))

    return passing_tickets, todo_items


def read_ticket_evidence(ticket):
    evidence_dir = ROOT / "docs" / "evidence" / ticket
    comment_path = evidence_dir / "JIRA_COMMENT.md"
    if not comment_path.is_file():
        raise FileNotFoundError(f"{ticket}: missing comment file {comment_path}")

    comment = comment_path.read_text(encoding="utf-8")
    lines = comment.splitlines()
    artifact_parts = []
    collecting_artifacts = False
    for line in lines:
        if line.startswith("- Artifact:"):
            artifact_parts.append(line.partition(":")[2].strip())
            collecting_artifacts = True
        elif collecting_artifacts:
            if line.startswith("- "):
                break
            if line.strip():
                artifact_parts.append(line.strip())

    artifact_text = " ".join(artifact_parts)
    artifact_paths = [
        item.strip().strip("`")
        for item in artifact_text.split(";")
        if item.strip()
    ]
    if not artifact_paths:
        raise ValueError(f"{ticket}: no '- Artifact:' paths found in {comment_path}")

    resolved_artifacts = []
    for artifact in artifact_paths:
        path = (ROOT / artifact).resolve()
        if not path.is_file():
            raise FileNotFoundError(f"{ticket}: artifact does not exist: {path}")
        resolved_artifacts.append(path)
    return comment, resolved_artifacts


def markdown_to_adf(comment):
    content = []
    for line in comment.splitlines():
        paragraph = {"type": "paragraph"}
        if line:
            paragraph["content"] = [{"type": "text", "text": line}]
        content.append(paragraph)
    return {"type": "doc", "version": 1, "content": content}


class JiraUploader:
    def __init__(self, base_url, email, api_token):
        self.base_url = base_url.rstrip("/")
        self.auth = (email, api_token)
        self.last_request_started = None
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        LOG_PATH.touch(exist_ok=True)

    def _wait_for_rate_limit(self):
        now = time.monotonic()
        if self.last_request_started is not None:
            remaining = REQUEST_INTERVAL - (now - self.last_request_started)
            if remaining > 0:
                time.sleep(remaining)
        self.last_request_started = time.monotonic()

    def _log(self, message):
        with LOG_PATH.open("a", encoding="utf-8") as log_file:
            log_file.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} {message}\n")

    def _send(self, method, url, **kwargs):
        self._wait_for_rate_limit()
        try:
            response = requests.request(method, url, auth=self.auth, **kwargs)
        except requests.RequestException as exc:
            self._log(f"ERROR {method} {url}: {exc}")
            raise

        self._log(
            f"RESPONSE {method} {url} status={response.status_code} "
            f"body={response.text!r}"
        )
        response.raise_for_status()
        return response

    def post_comment(self, ticket, comment):
        url = f"{self.base_url}/rest/api/3/issue/{ticket}/comment"
        payload = {"body": markdown_to_adf(comment)}
        self._send(
            "POST",
            url,
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
        )

    def post_attachment(self, ticket, path):
        url = f"{self.base_url}/rest/api/3/issue/{ticket}/attachments"
        with path.open("rb") as attachment_file:
            self._send(
                "POST",
                url,
                headers={"X-Atlassian-Token": "no-check"},
                files={"file": attachment_file},
            )


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="backslashreplace")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print planned Jira actions without sending requests",
    )
    args = parser.parse_args()

    try:
        passing_tickets, todo_items = parse_evidence_index()
        ticket_evidence = [
            (ticket, *read_ticket_evidence(ticket)) for ticket in passing_tickets
        ]
    except (OSError, ValueError) as exc:
        print(f"Preflight failed: {exc}", file=sys.stderr)
        return 1

    if todo_items:
        print("To-do (not uploaded):")
        for ticket, result in todo_items:
            print(f"  {ticket}: {result}")

    if args.dry_run:
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with LOG_PATH.open("a", encoding="utf-8") as log_file:
            log_file.write(
                f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} "
                "DRY-RUN no Jira requests sent\n"
            )
        for ticket, comment, artifacts in ticket_evidence:
            print(f"\nCOMMENT POST {{BASE}}/rest/api/3/issue/{ticket}/comment")
            print(comment, end="" if comment.endswith("\n") else "\n")
            for path in artifacts:
                print(
                    f"ATTACHMENT POST {{BASE}}/rest/api/3/issue/{ticket}/attachments "
                    f"<- {path.relative_to(ROOT)}"
                )
        print(
            f"\nDry run complete: {len(ticket_evidence)} comments, "
            f"{sum(len(artifacts) for _, _, artifacts in ticket_evidence)} attachments."
        )
        return 0

    missing_environment = [
        name
        for name in ("JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN")
        if not os.environ.get(name)
    ]
    if missing_environment:
        print(
            "Missing required environment variable(s): "
            + ", ".join(missing_environment),
            file=sys.stderr,
        )
        return 1

    uploader = JiraUploader(
        os.environ["JIRA_BASE_URL"],
        os.environ["JIRA_EMAIL"],
        os.environ["JIRA_API_TOKEN"],
    )
    try:
        for ticket, comment, artifacts in ticket_evidence:
            uploader.post_comment(ticket, comment)
            for path in artifacts:
                uploader.post_attachment(ticket, path)
    except (requests.RequestException, OSError) as exc:
        print(f"Jira upload failed: {exc}", file=sys.stderr)
        return 1

    print(
        f"Upload complete: {len(ticket_evidence)} comments, "
        f"{sum(len(artifacts) for _, _, artifacts in ticket_evidence)} attachments."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
