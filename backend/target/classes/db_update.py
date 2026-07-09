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
        # Update employee (ID 14) under manager (ID 12)
        cursor.execute("UPDATE users SET manager_id = 12 WHERE username = 'employee'")
        # Update employee1 (ID 15) under manager1 (ID 13)
        cursor.execute("UPDATE users SET manager_id = 13 WHERE username = 'employee1'")
        connection.commit()
        print("Successfully updated manager_id assignments for employee and employee1.")
finally:
    connection.close()
