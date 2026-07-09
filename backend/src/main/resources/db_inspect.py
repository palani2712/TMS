import pymysql

connection = pymysql.connect(
    host='localhost',
    user='root',
    password='Palani@123',
    database='tododb',
    cursorclass=pymysql.cursors.DictCursor
)

try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT id, username, role, manager_id FROM users")
        result = cursor.fetchall()
        print("--- USERS IN DATABASE ---")
        for row in result:
            print(row)
        
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print("--- TABLES ---")
        print(tables)
        
        try:
            cursor.execute("SELECT * FROM tasks")
            tasks = cursor.fetchall()
            print("--- TASKS IN DATABASE ---")
            for t in tasks:
                print(t)
        except Exception as e:
            print("Error reading tasks:", e)
finally:
    connection.close()
