#!/usr/bin/env python3
"""
Script to link submarine modules to submarine products
"""
import requests
import json

# API configuration
API_BASE = "http://localhost:8000/api/v1"

# Load token from file
def load_token():
    try:
        with open("dev_token.txt", "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        print("❌ dev_token.txt not found. Run get_dev_token.py first.")
        return None

# Headers for API requests
def get_headers():
    token = load_token()
    if not token:
        return None
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

def link_modules_to_products():
    """Link submarine modules to submarine products"""
    print("🔗 Linking Submarine Modules to Products...")
    
    headers = get_headers()
    if not headers:
        return
    
    workspace_id = 6
    
    # Get all products
    products_response = requests.get(f"{API_BASE}/workspaces/{workspace_id}/products/", headers=headers)
    products_data = products_response.json()
    
    # Find submarine products
    submarine_products = []
    for product in products_data['data']['items']:
        if 'submarine' in product['name'].lower():
            submarine_products.append(product)
    
    print(f"Found {len(submarine_products)} submarine products")
    
    # Get all modules
    modules_response = requests.get(f"{API_BASE}/workspaces/{workspace_id}/modules/", headers=headers)
    modules_data = modules_response.json()
    
    # Find submarine modules (the ones with requirements)
    submarine_modules = []
    submarine_module_names = ['Hull & Structure', 'Propulsion System', 'Navigation & Control', 
                             'Life Support', 'Electrical Systems', 'Communications']
    
    for module in modules_data['data']['items']:
        if module['name'] in submarine_module_names:
            submarine_modules.append(module)
    
    print(f"Found {len(submarine_modules)} submarine system modules")
    
    # Link the latest submarine product to all submarine modules
    if submarine_products and submarine_modules:
        latest_submarine = submarine_products[0]  # Most recent product
        print(f"Linking modules to Product {latest_submarine['id']}: {latest_submarine['name']}")
        
        for module in submarine_modules:
            try:
                # Create ProductModule association via direct database insert
                # Since there's no API endpoint for this, we'll use SQL insert through dev routes
                link_data = {
                    "workspace_id": workspace_id,
                    "product_id": latest_submarine['id'],
                    "module_id": module['id']
                }
                
                # Use a generic SQL execution endpoint (if available) or manual insertion
                print(f"  Would link module '{module['name']}' (ID: {module['id']}) to product")
                
            except Exception as e:
                print(f"❌ Error linking module {module['name']}: {e}")
    
    print("Note: Module-Product linking requires database-level operations.")
    print("The API structure shows modules are linked but need manual association.")
    
    # For now, let's show which submarine products have modules
    print("\nCurrent module associations:")
    for product in submarine_products[:3]:  # Show first 3
        print(f"Product {product['id']}: {len(product.get('modules', []))} modules, {product.get('total_module_requirements', 0)} total requirements")

if __name__ == "__main__":
    link_modules_to_products()