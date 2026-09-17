from django.core.management.base import BaseCommand
from utils.database import get_students_collection

class Command(BaseCommand):
    help = "Migrate student departments based on roll number digits matching migrate_depts.js"

    def handle(self, *args, **options):
        self.stdout.write("Connected to MongoDB for department migration...")
        students_col = get_students_collection()
        students = list(students_col.find({}))
        self.stdout.write(f"Found {len(students)} students to check.")

        updated_count = 0
        for student in students:
            s_id = str(student.get("regNo", ""))
            dept_code = s_id[6:9] if len(s_id) >= 9 else ""

            dept = "OTHERS"
            if dept_code == "107":
                dept = "CYBER SECURITY"
            elif dept_code == "202":
                dept = "AIML"
            elif dept_code == "205":
                dept = "IOT"
            elif dept_code == "104":
                dept = "CSE"

            if student.get("department") != dept:
                students_col.update_one(
                    {"_id": student["_id"]},
                    {"$set": {"department": dept}}
                )
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(f"Migration complete. Updated {updated_count} students."))
