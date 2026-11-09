import csv

from django.core.management.base import BaseCommand

from ratings.views import build_uat_workbook_rows


class Command(BaseCommand):
    help = 'Export the calculated UAT KPI workbook rows from saved responses and tracked events.'

    def handle(self, *args, **options):
        rows = [
            ['KPI', 'Charter objective', 'Target', 'Actual result', 'Sample size', 'Status', 'Evidence reference', 'Numerator', 'Denominator'],
            *[
                [
                    row['kpi'],
                    row['objective'],
                    row['target'],
                    row['actual_result'],
                    row['sample_size'],
                    row['status'],
                    row['evidence_reference'],
                    row['numerator'],
                    row['denominator'],
                ]
                for row in build_uat_workbook_rows()
            ],
        ]
        path = 'fitfusion_uat_results.csv'
        with open(path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerows(rows)

        self.stdout.write(self.style.SUCCESS(f'Exported {len(rows) - 1} UAT KPI rows to {path}'))