from django.core.management.base import BaseCommand
from utils.database import get_db

class Command(BaseCommand):
    help = "Consolidate separate department collections into the students collection matching fix_collections.js"

    def handle(self, *args, **options):
        db = get_db()
        depts = ['CYBER', 'AIML']
        target_col = db['students']

        self.stdout.write("Starting department collection consolidation...")

        for dept in depts:
            if dept in db.list_collection_names():
                dept_col = db[dept]
                count = dept_col.count_documents({})
                if count > 0:
                    self.stdout.write(f"Found {count} documents in '{dept}'. Moving to 'students'...")
                    docs = list(dept_col.find({}))
                    for doc in docs:
                        reg_no = doc.get("regNo")
                        if reg_no is None:
                            continue
                        exists = target_col.find_one({"regNo": reg_no})
                        if not exists:
                            target_col.insert_one(doc)
                        else:
                            target_col.update_one(
                                {"regNo": reg_no},
                                {"$set": {
                                    "password": doc.get("password"),
                                    "name": doc.get("name"),
                                    "department": dept
                                }}
                            )
                    self.stdout.write(f"Finished moving '{dept}'.")

        self.stdout.write(self.style.SUCCESS("Consolidation complete. The 'students' collection is now the source of truth."))
