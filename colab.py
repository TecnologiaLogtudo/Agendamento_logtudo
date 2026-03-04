import bcrypt

# Gerar hashs
def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

print(f"admin: {hash_password('Agenda@123')}")
print(f"colab1: {hash_password('Colab@123')}")
print(f"colab2: {hash_password('Julio123')}")