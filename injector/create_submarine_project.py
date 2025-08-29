#!/usr/bin/env python3
"""
Script to create submarine project structure using API endpoints
"""
import requests
import json
import time

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

# Submarine system modules structure
SUBMARINE_MODULES = {
    "Hull & Structure": {
        "description": "Structural integrity, pressure hull, ballast tanks, and compartmentalization",
        "requirements": {
            "L0": {"name": "Hull System", "desc": "Overall hull system requirements"},
            "L1": {"name": "Pressure Hull", "desc": "Main pressure-resistant structure"},
            "L2": {"name": "Hull Materials", "desc": "Material specifications for hull construction"},
            "L3": {"name": "Steel Composition", "desc": "High-strength steel alloy requirements"},
            "L4": {"name": "Welding Standards", "desc": "Welding procedures and quality standards"},
            "L5": {"name": "Weld Inspection", "desc": "Non-destructive testing procedures"}
        }
    },
    "Propulsion System": {
        "description": "Nuclear reactor, steam generation, turbine, and propeller systems",
        "requirements": {
            "L0": {"name": "Propulsion System", "desc": "Overall propulsion system requirements"},
            "L1": {"name": "Nuclear Reactor", "desc": "Nuclear power plant requirements"},
            "L2": {"name": "Reactor Core", "desc": "Nuclear fuel and control systems"},
            "L3": {"name": "Control Rods", "desc": "Neutron absorption control mechanisms"},
            "L4": {"name": "Rod Drive Mechanism", "desc": "Automated control rod positioning"},
            "L5": {"name": "Position Sensors", "desc": "Precise rod position monitoring"}
        }
    },
    "Navigation & Control": {
        "description": "Navigation, sonar, periscope, and steering control systems",
        "requirements": {
            "L0": {"name": "Navigation System", "desc": "Overall navigation and control requirements"},
            "L1": {"name": "Sonar System", "desc": "Acoustic detection and ranging"},
            "L2": {"name": "Active Sonar", "desc": "High-frequency active acoustic system"},
            "L3": {"name": "Transducer Array", "desc": "Acoustic signal transmission/reception"},
            "L4": {"name": "Hydrophone Elements", "desc": "Individual acoustic sensors"},
            "L5": {"name": "Sensor Calibration", "desc": "Acoustic sensitivity calibration"}
        }
    },
    "Life Support": {
        "description": "Air purification, oxygen generation, water treatment, and environmental control",
        "requirements": {
            "L0": {"name": "Life Support System", "desc": "Overall life support requirements"},
            "L1": {"name": "Atmospheric Control", "desc": "Air quality and pressure management"},
            "L2": {"name": "Oxygen Generation", "desc": "Electrolytic oxygen production"},
            "L3": {"name": "Electrolysis Unit", "desc": "Water splitting for oxygen production"},
            "L4": {"name": "Electrodes", "desc": "Conductive elements for electrolysis"},
            "L5": {"name": "Electrode Coating", "desc": "Corrosion-resistant surface treatment"}
        }
    },
    "Electrical Systems": {
        "description": "Power generation, distribution, batteries, and electrical safety systems",
        "requirements": {
            "L0": {"name": "Electrical System", "desc": "Overall electrical power requirements"},
            "L1": {"name": "Power Distribution", "desc": "Electrical power routing and control"},
            "L2": {"name": "Main Switchboard", "desc": "Primary electrical distribution panel"},
            "L3": {"name": "Circuit Breakers", "desc": "Overcurrent protection devices"},
            "L4": {"name": "Arc Detection", "desc": "Electrical arc fault detection"},
            "L5": {"name": "Current Sensors", "desc": "Real-time current measurement"}
        }
    },
    "Communications": {
        "description": "Radio, satellite, internal communications, and emergency systems",
        "requirements": {
            "L0": {"name": "Communications System", "desc": "Overall communication requirements"},
            "L1": {"name": "Radio Systems", "desc": "External radio communication capability"},
            "L2": {"name": "VLF Antenna", "desc": "Very low frequency antenna system"},
            "L3": {"name": "Antenna Elements", "desc": "Conductive antenna components"},
            "L4": {"name": "Wire Conductors", "desc": "Electrical conductivity specifications"},
            "L5": {"name": "Conductor Insulation", "desc": "Electrical insulation requirements"}
        }
    }
}

def get_workspace_id():
    """Get the first available workspace ID"""
    try:
        headers = get_headers()
        if not headers:
            return None
        response = requests.get(f"{API_BASE}/workspaces", headers=headers)
        response.raise_for_status()
        workspaces = response.json().get("data", [])
        if workspaces:
            return workspaces[0]["id"]
        else:
            print("❌ No workspaces found")
            return None
    except Exception as e:
        print(f"❌ Error fetching workspaces: {e}")
        print(f"Response: {response.text if 'response' in locals() else 'N/A'}")
        return None

def create_product(workspace_id, name, description):
    """Create a product via API"""
    try:
        headers = get_headers()
        if not headers:
            return None
        payload = {
            "name": name,
            "description": description,
            "create_default_module": True
        }
        response = requests.post(
            f"{API_BASE}/workspaces/{workspace_id}/products",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()["data"]
    except Exception as e:
        print(f"❌ Error creating product: {e}")
        print(f"Response: {response.text if 'response' in locals() else 'N/A'}")
        return None

def create_module(workspace_id, name, description):
    """Create a module via API"""
    try:
        headers = get_headers()
        if not headers:
            return None
        payload = {
            "name": name,
            "description": description,
            "shared": True  # All modules should be shared
        }
        response = requests.post(
            f"{API_BASE}/workspaces/{workspace_id}/modules",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()["data"]
    except Exception as e:
        print(f"❌ Error creating module '{name}': {e}")
        print(f"Response: {response.text if 'response' in locals() else 'N/A'}")
        return None


def create_requirement(workspace_id, name, definition, module_id, level, parent_id=None):
    """Create a requirement via API"""
    try:
        headers = get_headers()
        if not headers:
            return None
        payload = {
            "name": name,
            "definition": definition,
            "module_id": module_id,
            "level": level,
            "priority": "medium",  # Default priority
            "functional": "functional",  # Default to functional
            "validation_method": "test",  # Default validation method
            "status": "draft"  # Default status
        }
        if parent_id:
            payload["parent_req_id"] = parent_id
            
        response = requests.post(
            f"{API_BASE}/workspaces/{workspace_id}/requirements",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()["data"]
    except Exception as e:
        print(f"❌ Error creating requirement '{name}': {e}")
        print(f"Response: {response.text if 'response' in locals() else 'N/A'}")
        return None

def create_submarine_project():
    """Main function to create the submarine project structure"""
    print("🚢 Creating Submarine Project Structure...")
    
    # Get workspace
    workspace_id = get_workspace_id()
    if not workspace_id:
        return
    
    print(f"✅ Using workspace ID: {workspace_id}")
    
    # Create submarine product
    product_data = create_product(
        workspace_id,
        "SSN Virginia Class Submarine",
        "Nuclear-powered fast attack submarine designed for anti-submarine warfare, anti-surface warfare, strike warfare, special operations, intelligence gathering, and other missions"
    )
    
    if not product_data:
        return
        
    product_id = product_data["id"]
    print(f"✅ Created submarine product with ID: {product_id}")
    
    
    # Create modules and their hierarchical requirements
    for module_name, module_data in SUBMARINE_MODULES.items():
        print(f"\n📦 Creating module: {module_name}")
        
        # Create module
        module = create_module(workspace_id, module_name, module_data["description"])
        if not module:
            continue
            
        module_id = module["id"]
        print(f"  ✅ Created module with ID: {module_id}")
        
        # Create hierarchical requirements L0-L5
        parent_req_id = None
        
        for level in ["L0", "L1", "L2", "L3", "L4", "L5"]:
            req_data = module_data["requirements"][level]
            
            requirement = create_requirement(
                workspace_id,
                req_data["name"],
                req_data["desc"],
                module_id,
                level,
                parent_req_id
            )
            
            if requirement:
                req_id = requirement["id"]
                public_id = requirement.get("public_id", "N/A")
                print(f"    ✅ Created {level} requirement '{req_data['name']}' ({public_id}) with ID: {req_id}")
                parent_req_id = req_id  # Next level will be child of current level
            else:
                print(f"    ❌ Failed to create {level} requirement '{req_data['name']}'")
                break
        
        # Small delay to avoid overwhelming the API
        time.sleep(0.1)
    
    print(f"\n🎉 Submarine project created successfully!")
    print(f"📊 Summary:")
    print(f"   - Product ID: {product_id}")
    print(f"   - Created {len(SUBMARINE_MODULES)} modules")
    print(f"   - Created {len(SUBMARINE_MODULES) * 6} requirements (L0-L5 for each module)")

if __name__ == "__main__":
    create_submarine_project()