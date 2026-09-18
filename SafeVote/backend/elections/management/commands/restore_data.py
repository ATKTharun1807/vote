import json
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand
from utils.database import get_students_collection, get_configs_collection

class Command(BaseCommand):
    help = "Restore data from local datastore files matching restore_data.js"

    def handle(self, *args, **options):
        base_dir = settings.BASE_DIR.parent
        data_dir = base_dir / 'data'
        students_col = get_students_collection()
        configs_col = get_configs_collection()

        self.stdout.write(f"Checking data directory at {data_dir}...")
        if not data_dir.exists():
            self.stdout.write("No local 'data' directory found. Nothing to restore.")
            return

        # Restore students.db / cyber security.db
        for filename, default_dept in [('students.db', 'CYBER SECURITY'), ('cyber security.db', 'CYBER SECURITY'), ('AIML.db', 'AIML')]:
            db_file = data_dir / filename
            if db_file.exists():
                self.stdout.write(f"Restoring from {filename}...")
                count = 0
                with open(db_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            record = json.loads(line)
                            reg_no = record.get('regNo')
                            if reg_no is not None:
                                students_col.update_one(
                                    {"regNo": int(reg_no)},
                                    {"$set": {
                                        "name": record.get("name"),
                                        "password": record.get("password"),
                                        "hasVoted": record.get("hasVoted", False),
                                        "department": record.get("department", default_dept)
                                    }},
                                    upsert=True
                                )
                                count += 1
                        except Exception as e:
                            self.stderr.write(f"Error parsing line: {e}")
                self.stdout.write(self.style.SUCCESS(f"Restored {count} records from {filename}."))

        # Restore config.db
        config_file = data_dir / 'config.db'
        if config_file.exists():
            self.stdout.write("Restoring config from config.db...")
            with open(config_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                        configs_col.update_one(
                            {"type": "main"},
                            {"$set": {
                                "electionName": record.get("electionName", "Student Council Election"),
                                "electionStatus": record.get("electionStatus", "NOT_STARTED"),
                                "adminKey": record.get("adminKey", "admin123")
                            }},
                            upsert=True
                        )
                        self.stdout.write(self.style.SUCCESS("Restored election configuration."))
                    except Exception as e:
                        self.stderr.write(f"Error restoring config: {e}")
