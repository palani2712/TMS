import pymysql
import bcrypt

connection = pymysql.connect(
    host='localhost',
    user='root',
    password='Palani@123',
    database='tododb',
    cursorclass=pymysql.cursors.DictCursor
)

accounts = {
    'generalmanager': 'generalmanager123',
    'manager': 'manager',
    'manager1': 'manager1',
    'employee': 'employee',
    'employee1': 'employee1'
}

try:
    with connection.cursor() as cursor:
        for username, password in accounts.items():
            # Generate BCrypt hash
            salt = bcrypt.gensalt(10)
            # Spring Security expects standard bcrypt hash format
            hashed = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
            # Replace $2b$ with $2a$ if needed, though Spring Security supports $2b$
            
            cursor.execute("UPDATE users SET password = %s WHERE username = %s", (hashed, username))
        connection.commit()
        print("Successfully updated password hashes for test users.")
finally:
    connection.close()
