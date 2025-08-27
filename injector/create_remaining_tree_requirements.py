#!/usr/bin/env python3
"""
Script to create remaining submarine requirement trees (Life Support, Electrical, Communications)
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

def create_requirement(workspace_id, name, definition, req_collection_id, level, parent_id=None):
    """Create a requirement via API"""
    try:
        headers = get_headers()
        if not headers:
            return None
        payload = {
            "name": name,
            "definition": definition,
            "req_collection_id": req_collection_id,
            "level": level,
            "priority": "medium",
            "functional": "functional",
            "validation_method": "test",
            "status": "draft"
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
        return None

# Remaining submarine requirement tree structures
REMAINING_REQUIREMENT_TREES = {
    25: {  # Life Support req_collection_id
        "module_name": "Life Support",
        "tree": {
            "L0": [
                {
                    "name": "Life Support System",
                    "definition": "Complete life support and environmental control system",
                    "children": {
                        "L1": [
                            {
                                "name": "Atmospheric Control",
                                "definition": "Air quality and pressure management systems",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Oxygen Generation",
                                            "definition": "Electrolytic oxygen production system",
                                            "children": {
                                                "L3": [
                                                    {"name": "Electrolysis Unit", "definition": "Water splitting electrolysis equipment"},
                                                    {"name": "Oxygen Storage", "definition": "High-pressure oxygen storage tanks"},
                                                    {"name": "Purity Control", "definition": "Oxygen purity monitoring and control"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "CO2 Scrubbing",
                                            "definition": "Carbon dioxide removal system",
                                            "children": {
                                                "L3": [
                                                    {"name": "Chemical Scrubbers", "definition": "CO2 chemical absorption system"},
                                                    {"name": "Regenerative System", "definition": "Scrubber material regeneration"},
                                                    {"name": "Monitoring Sensors", "definition": "CO2 level monitoring and alarms"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Air Filtration",
                                            "definition": "Particulate and contaminant filtering",
                                            "children": {
                                                "L3": [
                                                    {"name": "HEPA Filters", "definition": "High-efficiency particulate air filters"},
                                                    {"name": "Activated Carbon", "definition": "Chemical contaminant absorption"},
                                                    {"name": "Pre-filters", "definition": "Primary dust and debris filtration"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "name": "Water Systems",
                                "definition": "Fresh water generation and waste management",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Fresh Water Generation",
                                            "definition": "Seawater distillation and purification",
                                            "children": {
                                                "L3": [
                                                    {"name": "Distillation Plant", "definition": "Seawater distillation equipment"},
                                                    {"name": "Reverse Osmosis", "definition": "RO membrane water purification"},
                                                    {"name": "Water Storage", "definition": "Fresh water storage tanks"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Waste Management",
                                            "definition": "Sewage and waste water processing",
                                            "children": {
                                                "L3": [
                                                    {"name": "Sewage Treatment", "definition": "Biological waste treatment system"},
                                                    {"name": "Waste Compaction", "definition": "Solid waste compaction and storage"},
                                                    {"name": "Discharge System", "definition": "Treated waste discharge overboard"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "name": "Temperature Control",
                                "definition": "Heating, ventilation, and air conditioning",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "HVAC System",
                                            "definition": "Heating, ventilation, and air conditioning",
                                            "children": {
                                                "L3": [
                                                    {"name": "Air Handlers", "definition": "Central air handling units"},
                                                    {"name": "Ductwork", "definition": "Air distribution duct system"},
                                                    {"name": "Temperature Sensors", "definition": "Compartment temperature monitoring"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Chilled Water",
                                            "definition": "Cooling water circulation system",
                                            "children": {
                                                "L3": [
                                                    {"name": "Chillers", "definition": "Water cooling equipment"},
                                                    {"name": "Circulation Pumps", "definition": "Cooling water circulation pumps"},
                                                    {"name": "Heat Exchangers", "definition": "Air cooling heat exchangers"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            ]
        }
    },
    26: {  # Electrical Systems req_collection_id
        "module_name": "Electrical Systems", 
        "tree": {
            "L0": [
                {
                    "name": "Electrical System",
                    "definition": "Complete electrical power generation and distribution",
                    "children": {
                        "L1": [
                            {
                                "name": "Power Generation",
                                "definition": "Primary and emergency power generation systems",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Main Generator",
                                            "definition": "Steam turbine driven main generator",
                                            "children": {
                                                "L3": [
                                                    {"name": "Generator Windings", "definition": "Main generator electrical windings"},
                                                    {"name": "Excitation System", "definition": "Generator field excitation control"},
                                                    {"name": "Voltage Regulation", "definition": "Output voltage regulation system"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Emergency Generator",
                                            "definition": "Diesel emergency backup generator",
                                            "children": {
                                                "L3": [
                                                    {"name": "Diesel Engine", "definition": "Emergency generator prime mover"},
                                                    {"name": "Fuel System", "definition": "Emergency generator fuel supply"},
                                                    {"name": "Auto-start System", "definition": "Automatic emergency start system"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "name": "Power Distribution",
                                "definition": "Electrical power routing and control systems",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Main Switchboard",
                                            "definition": "Primary electrical distribution panel",
                                            "children": {
                                                "L3": [
                                                    {"name": "Bus Bars", "definition": "Main electrical bus bar system"},
                                                    {"name": "Circuit Breakers", "definition": "Overcurrent protection devices"},
                                                    {"name": "Load Centers", "definition": "Secondary distribution panels"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Power Management",
                                            "definition": "Electrical load monitoring and control",
                                            "children": {
                                                "L3": [
                                                    {"name": "Load Monitoring", "definition": "Real-time electrical load measurement"},
                                                    {"name": "Load Shedding", "definition": "Automatic non-essential load disconnection"},
                                                    {"name": "Power Quality", "definition": "Voltage and frequency monitoring"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "name": "Battery Systems",
                                "definition": "Emergency and backup battery power systems",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Main Batteries",
                                            "definition": "Primary backup battery bank",
                                            "children": {
                                                "L3": [
                                                    {"name": "Lead-Acid Cells", "definition": "Deep-cycle lead-acid battery cells"},
                                                    {"name": "Battery Monitoring", "definition": "Cell voltage and current monitoring"},
                                                    {"name": "Charging System", "definition": "Automatic battery charging control"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "UPS Systems",
                                            "definition": "Uninterruptible power supplies for critical loads",
                                            "children": {
                                                "L3": [
                                                    {"name": "Critical Load UPS", "definition": "Navigation and safety system UPS"},
                                                    {"name": "Computer UPS", "definition": "Computer and control system UPS"},
                                                    {"name": "Communication UPS", "definition": "Radio and communication system UPS"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            ]
        }
    },
    27: {  # Communications req_collection_id
        "module_name": "Communications",
        "tree": {
            "L0": [
                {
                    "name": "Communications System", 
                    "definition": "Complete internal and external communication systems",
                    "children": {
                        "L1": [
                            {
                                "name": "Radio Systems",
                                "definition": "External radio communication capabilities",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "VLF Receiver",
                                            "definition": "Very low frequency submarine communication",
                                            "children": {
                                                "L3": [
                                                    {"name": "VLF Antenna", "definition": "Trailing wire VLF reception antenna"},
                                                    {"name": "Signal Processing", "definition": "VLF signal demodulation and processing"},
                                                    {"name": "Message Decoding", "definition": "Encrypted message decoding system"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "HF Transceiver",
                                            "definition": "High frequency radio transceiver",
                                            "children": {
                                                "L3": [
                                                    {"name": "HF Antenna", "definition": "High frequency antenna system"},
                                                    {"name": "Frequency Control", "definition": "Automatic frequency selection"},
                                                    {"name": "Power Amplifier", "definition": "HF transmission power amplifier"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Satellite Communication",
                                            "definition": "Satellite communication when surfaced",
                                            "children": {
                                                "L3": [
                                                    {"name": "Satellite Antenna", "definition": "Directional satellite communication antenna"},
                                                    {"name": "Tracking System", "definition": "Automatic satellite tracking control"},
                                                    {"name": "Data Terminal", "definition": "Satellite data communication terminal"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "name": "Internal Communications",
                                "definition": "Shipboard internal communication systems",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Intercom System",
                                            "definition": "Internal voice communication system",
                                            "children": {
                                                "L3": [
                                                    {"name": "Sound-powered Phones", "definition": "Emergency voice communication"},
                                                    {"name": "Electronic Intercom", "definition": "Powered internal communication"},
                                                    {"name": "Public Address", "definition": "General announcement system"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Data Network",
                                            "definition": "Internal data communication network",
                                            "children": {
                                                "L3": [
                                                    {"name": "Ethernet Backbone", "definition": "Main data network infrastructure"},
                                                    {"name": "Network Switches", "definition": "Data switching and routing equipment"},
                                                    {"name": "Fiber Optic Links", "definition": "High-speed fiber optic connections"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "name": "Emergency Communications",
                                "definition": "Emergency and distress communication systems",
                                "children": {
                                    "L2": [
                                        {
                                            "name": "Emergency Beacon",
                                            "definition": "Emergency position indicating beacon",
                                            "children": {
                                                "L3": [
                                                    {"name": "EPIRB", "definition": "Emergency position indicating radio beacon"},
                                                    {"name": "GPS Integration", "definition": "GPS position encoding in distress signal"},
                                                    {"name": "Auto-activation", "definition": "Automatic beacon activation system"}
                                                ]
                                            }
                                        },
                                        {
                                            "name": "Rescue Communications",
                                            "definition": "Search and rescue communication equipment",
                                            "children": {
                                                "L3": [
                                                    {"name": "Emergency Radio", "definition": "Portable emergency radio equipment"},
                                                    {"name": "Signal Flares", "definition": "Visual distress signaling devices"},
                                                    {"name": "Underwater Telephone", "definition": "Emergency underwater communication"}
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            ]
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
        return None

def create_requirement_tree(workspace_id, req_collection_id, tree_node, level, parent_id=None):
    """Recursively create requirement tree"""
    created_requirements = []
    
    for req_data in tree_node:
        # Create the requirement
        requirement = create_requirement(
            workspace_id,
            req_data["name"],
            req_data["definition"],
            req_collection_id,
            level,
            parent_id
        )
        
        if requirement:
            req_id = requirement["id"]
            public_id = requirement.get("public_id", "N/A")
            indent = "  " * (int(level[1]) + 1)
            print(f"{indent}✅ Created {level} requirement '{req_data['name']}' ({public_id}) with ID: {req_id}")
            created_requirements.append(requirement)
            
            # Create children if they exist
            if "children" in req_data:
                for child_level, child_nodes in req_data["children"].items():
                    child_requirements = create_requirement_tree(
                        workspace_id, req_collection_id, child_nodes, child_level, req_id
                    )
                    created_requirements.extend(child_requirements)
        else:
            print(f"❌ Failed to create {level} requirement '{req_data['name']}'")
    
    return created_requirements

def create_remaining_requirements():
    """Add expanded tree requirements for remaining modules"""
    print("🌳 Creating Remaining Submarine Requirement Trees...")
    
    workspace_id = get_workspace_id()
    if not workspace_id:
        return
        
    print(f"✅ Using workspace ID: {workspace_id}")
    
    total_created = 0
    
    for req_collection_id, module_data in REMAINING_REQUIREMENT_TREES.items():
        module_name = module_data["module_name"]
        print(f"\n🌿 Creating {module_name} requirement trees...")
        
        # Create the tree starting from L0
        for level, nodes in module_data["tree"].items():
            requirements = create_requirement_tree(
                workspace_id, req_collection_id, nodes, level
            )
            total_created += len(requirements)
        
        # Small delay between modules
        time.sleep(0.2)
    
    print(f"\n🎉 Remaining submarine requirement trees created successfully!")
    print(f"📊 Created {total_created} additional requirements across {len(REMAINING_REQUIREMENT_TREES)} modules")

if __name__ == "__main__":
    create_remaining_requirements()