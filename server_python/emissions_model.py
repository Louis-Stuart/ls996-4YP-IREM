from typing import List, Optional, Dict, Any
import csv

def conv_str_to_list(string):
    string = string[1:-1]
    array = string.split(",")
    for i in range(len(array)):
        array[i] = float(array[i])
    return array

def conv_str_to_2Dlist(string):
    string = string[2:-2]
    temp = string.split("], [")

    array = []
    for i in temp:
        values = i.split(",")
        array.append([float(values[0]),float(values[1])])

    return array

def predict_EF(data):
    EF = 3468.704826339810000000
    coeff = [0.0932067979903392,-0.00194333310604562,1.28074108591739E-05,-0.328526400536502,0.0340623409366374,-0.00106023588104902,-7.2815573051107E-06,1.82975308864613,1.60608212784579,5.32262174245212,-3.8391223551812,4.24698305306223,-0.466627202881156,2264.3569237158,-1473.44850139358,300.637530909706,2015.02159251535,-2081.51120858741,710.999341804263,-572.764216473149,1685.62446384642,-1657.61586382143,486.646161887055,-1270.03391026604,974.45775194784,-4132.73413221985,-2752.27624247428,3427.79173038576,25.0270465107654,357.490661811066,74.9150878851573,-0.144690918486398,-0.116031380549561,0.158031358210928,0.112858009240362,0.0213772104542398,0.0123365443099684,0.0229901951882782,0.00123099041918238,0.00425995069762012,-0.00309220857204584,-0.00134738049404667,-0.000837200039971282,-0.00251275082557041,0.00201346926658351,-0.00919354116830581,0.00665134991524189,-6.34536083931966E-05,0.0221117082947926,-0.00236599651405272,0.136906882485802]
  
    inputs = [float(data["Speed_limi"]), float(data["Speed_limi"])**2, float(data["Speed_limi"])**3,
              float(data["tas"]), float(data["tas"])**2, float(data["tas"])**3,
              float(data["rain"]),
              float(data["Car_prop"]), float(data["Car_prop"])**2,
              float(data["LGV_prop"]), float(data["LGV_prop"])**2,
              float(data["HGV_prop"]), float(data["HGV_prop"])**2,
              float(data["Cars_BEV"]), 100*float(data["Cars_BEV"])**2, 10000*float(data["Cars_BEV"])**3,
              float(data["LGVs_BEV"]), 100*float(data["LGVs_BEV"])**2, 10000*float(data["LGVs_BEV"])**3,
              float(data["Cars_Diesel"]), float(data["Cars_Diesel"])**2, float(data["Cars_Diesel"])**3,
              float(data["Cars_Petrol"]), float(data["Cars_Petrol"])**2, float(data["Cars_Petrol"])**3,
              float(data["LGVs_Diesel"]), float(data["LGVs_Diesel"])**2, float(data["LGVs_Diesel"])**3,
              float(data["LGVs_Petrol"]), float(data["LGVs_Petrol"])**2, float(data["LGVs_Petrol"])**3,
              int(data["Road_categ"]=="TA"),int(data["Road_categ"]=="TM"),int(data["Road_categ"]=="PA"),int(data["Road_categ"]=="PM"),
              int(data["material"]=="HFS"),int(data["material"]=="LTUV14"),int(data["material"]=="TSF"),int(data["material"]=="THSURF"),
              int(data["material"]=="RASH"),int(data["material"]=="TUPM10"),int(data["material"]=="AIBH14"),int(data["material"]=="TSP"),
              int(data["material"]=="HTG14"),int(data["material"]=="AIBS10"),int(data["material"]=="PQCON"),int(data["material"]=="AISH14"),
              float(data["Length"]),1e-6*float(data["Length"])**2,1e-9*float(data["Length"])**3,
              10000/float(data["All_motor_"])]

    for i in range(len(coeff)):
        EF += coeff[i]*inputs[i]

    return EF

def output_segment(data, geom):
    output = {"id": str(data["Section_La"]),
              "name": str(data["Road_Numbe"]),
              "roadCat": str(data["Road_categ"]),
              "geometry": {
                  "point": { "lat": conv_str_to_list(geom["point"])[0], "lon": conv_str_to_list(geom["point"])[1] },
                  "line": { "type": "LineString", "coordinates": conv_str_to_2Dlist(geom["coordinates"])}
                  },
              "emissionFactor": {
                  "value": predict_EF(data),
                  "unit": "kgCO2/vehicle"
                  },
              "trafficVolume": {
                  "cars": float(data["Car_prop"])*float(data["All_motor_"]),
                  "LGVs": float(data["LGV_prop"])*float(data["All_motor_"]),
                  "HGVs": float(data["HGV_prop"])*float(data["All_motor_"]),
                  "total": float(data["All_motor_"]),
                  },
              "weather": {
                  "tas": float(data["tas"]),
                  "tasUnit": "C",
                  "rainfall": float(data["rain"]),
                  "rainfallUnit": "mm/year"
                  },
              "material": {
                  "type": str(data["material"]),
                  "thickness": float(data["meanthicc"]),
                  "thicknessUnit": "mm",
                  "age": float(data["meanage"]),
                  "ageUnit": "years"
                  },
              "speedLimit": {
                  "value": float(data["Speed_limi"]),
                  "unit": "mph"
                  },
              "fuelTypes": {
                  "cars": {"diesel": float(data["Cars_Diesel"]), "petrol": float(data["Cars_Petrol"]), "hybrid": float(data["Cars_HEV"]), "BEV": float(data["Cars_BEV"])},
                  "LGVs": {"diesel": float(data["LGVs_Diesel"]), "petrol": float(data["LGVs_Petrol"]), "hybrid": float(data["LGVs_HEV"]), "BEV": float(data["LGVs_BEV"])},
                  "HGVs": {"diesel": float(data["HGVs_Diesel"]), "petrol": float(data["HGVs_Petrol"]), "hybrid": float(data["HGVs_HEV"]), "BEV": float(data["HGVs_BEV"])}
                  }
              }
    return output

class EmissionsModel:
    """
    Handles business logic for road segment emissions.
    Currently uses static seed data, but designed to be extended with AI predictions.
    """

    def __init__(self, dataset_path: str, geom_path: str):
        segmentList = []
        geomList = []
        with open(dataset_path, encoding="utf-8") as file:
            fileReader = csv.DictReader(file, delimiter=",")
            for row in fileReader:
                segmentList.append(row)
        with open(geom_path, encoding="utf-8") as file:
            fileReader = csv.DictReader(file, delimiter=",")
            for row in fileReader:
                geomList.append(row)

        if len(segmentList) != len(geomList):
            raise ValueError("Segment and geometry CSV files must have the same number of rows.")
                
        self.segments = []
        for i in range(len(segmentList)):
            self.segments.append(output_segment(segmentList[i],geomList[i]))

    def get_segments(
        self,
        bbox: Optional[str] = None,
        min_co2: Optional[float] = None,
        max_co2: Optional[float] = None,
        query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves filtered road segments.
        
        Returns:
            List of segment dictionaries matching the schema expected by the frontend.
        """
        items = self.segments

        # 1. Spatial Filter (Bounding Box)
        # Format: "minLon,minLat,maxLon,maxLat"
        if bbox:
            try:
                min_lon, min_lat, max_lon, max_lat = map(float, bbox.split(","))
                items = [
                    s for s in items
                    if min_lon <= s["geometry"]["point"]["lon"] <= max_lon and
                       min_lat <= s["geometry"]["point"]["lat"] <= max_lat
                ]
            except ValueError:
                pass # Ignore invalid bbox format gracefully

        # 2. Emission Value Filter
        if min_co2 is not None:
            items = [s for s in items if s["emissionFactor"]["value"] >= min_co2]
        if max_co2 is not None:
            items = [s for s in items if s["emissionFactor"]["value"] <= max_co2]

        # 3. Text Search (ID or Name)
        if query:
            q_str = query.lower()
            items = [
                s for s in items
                if q_str in s["id"].lower() or (s["name"] and q_str in s["name"].lower())
            ]

        return items

    def get_segment_by_id(self, segment_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a single segment by its ID.
        """
        for s in self.segments:
            if s["id"] == segment_id:
                return s
        return None

    def get_total_count(self) -> int:
        """
        Returns the total number of segments loaded.
        """
        return len(self.segments)



#SCHEMA
"""
INTEGRATION POINT:
        Override or modify this method to use your AI model.
        
        CRITICAL: The returned data MUST match the following schema for the frontend to work:
        [
            {
                "id": "str",
                "name": "str",
                "roadCat": "str",
                "geometry": {
                    "point": { "lat": float, "lon": float },
                    "line": { "type": "LineString", "coordinates": [[lat, lon], ...] }
                },
                "emissionFactor": {
                    "value": float,
                    "unit": "gCO2/vehicle"
                },
                "trafficVolume": {
                    "cars": float,
                    "LGVs": float,
                    "HGVs": float,
                    "total": float,
                },
                "weather": {
                    "tas": float,
                    "tasUnit": "C",
                    "rainfall": float,
                    "rainfallUnit": "mm/year"
                },
                "material": {
                    "type": "str",
                    "thickness": float,
                    "thicknessUnit": "mm",
                    "age": float,
                    "ageUnit": "years"
                },
                "speedLimit": {
                    "value": float,
                    "unit": "mph"
                },
                "fuelTypes": {
                    "cars": {"diesel": float, "petrol": float, "hybrid": float, "BEV": float},
                    "LGVs": {"diesel": float, "petrol": float, "hybrid": float, "BEV": float},
                    "HGVs": {"diesel": float, "petrol": float, "hybrid": float, "BEV": float}
                }
            },
            ...
        ]
"""
