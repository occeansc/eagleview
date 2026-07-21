#!/usr/bin/env python3
"""
Eagleview v4.4.32 — Data Updater
================================
New in v4.0:
  Phase 1 — Read current DB state (for rank deltas + prev values)
  Phase 2 — Batch download all tickers
  Phase 3 — Compute sector returns + breadth (needs all stocks)
  Phase 4 — Compute ranks across ALL sectors (needs everyone's return)
  Phase 5 — Compute deltas, streaks vs old state
  Phase 6 — Save snapshots of old state, then write new state

Env vars:
  SUPABASE_URL          project URL — NO trailing /rest/v1
  SUPABASE_SERVICE_KEY  legacy eyJ... service_role key
"""

import os, sys, logging, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import requests
import pandas as pd
import yfinance as yf

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Sector baskets ────────────────────────────────────────────────────────────
SECTOR_STOCKS = [
    ("Semiconductors", [
        ("NVDA","NVIDIA"), ("AMD","Advanced Micro Devices"), ("AVGO","Broadcom"),
        ("TSM","Taiwan Semiconductor"), ("ASML","ASML Holding"), ("SKHY","SK hynix ADR"),
        ("ARM","Arm Holdings"), ("MU","Micron Technology"), ("INTC","Intel"),
        ("QCOM","Qualcomm"), ("MRVL","Marvell Technology"), ("AMAT","Applied Materials"),
        ("LRCX","Lam Research"), ("KLAC","KLA Corp"), ("TXN","Texas Instruments"),
        ("ADI","Analog Devices"), ("MCHP","Microchip Technology"), ("ON","ON Semiconductor"),
        ("NXPI","NXP Semiconductors"), ("MPWR","Monolithic Power Systems"), ("GFS","GlobalFoundries"),
        ("ALAB","Astera Labs"), ("SWKS","Skyworks Solutions"), ("QRVO","Qorvo"),
        ("STM","STMicroelectronics"),
    ]),
    ("Software & Cloud", [
        ("MSFT","Microsoft"), ("ORCL","Oracle"), ("ADBE","Adobe"),
        ("CRM","Salesforce"), ("NOW","ServiceNow"), ("SNOW","Snowflake"),
        ("DDOG","Datadog"), ("MDB","MongoDB"), ("HUBS","HubSpot"),
        ("WDAY","Workday"), ("VEEV","Veeva Systems"), ("TEAM","Atlassian"),
        ("GTLB","GitLab"), ("PATH","UiPath"), ("TWLO","Twilio"),
        ("BILL","BILL Holdings"), ("DOCN","DigitalOcean"), ("PCTY","Paylocity"),
        ("ESTC","Elastic"), ("APPF","AppFolio"), ("PCOR","Procore Technologies"),
        ("ZM","Zoom Communications"), ("U","Unity Software"), ("BOX","Box"),
    ]),
    ("Cybersecurity", [
        ("CRWD","CrowdStrike"), ("PANW","Palo Alto Networks"), ("ZS","Zscaler"),
        ("FTNT","Fortinet"), ("S","SentinelOne"), ("OKTA","Okta"),
        ("RBRK","Rubrik"), ("TENB","Tenable"), ("RPD","Rapid7"),
        ("QLYS","Qualys"), ("NET","Cloudflare"), ("CHKP","Check Point"),
        ("DT","Dynatrace"), ("GEN","Gen Digital"), ("VRNS","Varonis Systems"),
        ("RDWR","Radware"), ("AKAM","Akamai Technologies"), ("CSCO","Cisco Systems"),
        ("FFIV","F5"), ("FSLY","Fastly"), ("BB","BlackBerry"),
        ("CACI","CACI International"), ("LDOS","Leidos"), ("BAH","Booz Allen Hamilton"),
    ]),
    ("AI & Machine Learning", [
        ("PLTR","Palantir"), ("AI","C3.ai"), ("BBAI","BigBear.ai"),
        ("SOUN","SoundHound AI"), ("GOOG","Alphabet"), ("META","Meta Platforms"),
        ("AAPL","Apple"), ("IBM","IBM"), ("AMBA","Ambarella"),
        ("PEGA","Pegasystems"), ("NICE","NICE Systems"), ("SDGR","Schrodinger"),
        ("RXRX","Recursion Pharmaceuticals"), ("TEM","Tempus AI"), ("APP","AppLovin"),
        ("AEVA","Aeva Technologies"), ("ASAN","Asana"), ("BRZE","Braze"),
        ("UPST","Upstart"), ("NBIS","Nebius Group"), ("CRWV","CoreWeave"),
        ("MSFT","Microsoft"), ("NVDA","NVIDIA"), ("ORCL","Oracle"),
    ]),
    ("Fintech & Insurtech", [
        ("XYZ","Block"), ("PYPL","PayPal"), ("HOOD","Robinhood"),
        ("SOFI","SoFi Technologies"), ("AFRM","Affirm"), ("NU","Nu Holdings"),
        ("LMND","Lemonade"), ("ROOT","Root Insurance"), ("MQ","Marqeta"),
        ("RELY","Remitly"), ("TOST","Toast"), ("FLYW","Flywire"),
        ("DAVE","Dave"), ("NRDS","NerdWallet"), ("LC","LendingClub"),
        ("CLOV","Clover Health"), ("FICO","Fair Isaac"), ("WEX","WEX"),
        ("FIS","Fidelity National Information Services"), ("GPN","Global Payments"), ("QFIN","Qifu Technology"),
        ("STNE","StoneCo"), ("PAGS","PagSeguro Digital"), ("FOUR","Shift4 Payments"),
    ]),
    ("Digital Assets & Crypto", [
        ("COIN","Coinbase"), ("MSTR","MicroStrategy"), ("MARA","Marathon Digital"),
        ("RIOT","Riot Platforms"), ("CLSK","CleanSpark"), ("HUT","Hut 8"),
        ("BTBT","Bit Digital"), ("CIFR","Cipher Mining"), ("IREN","IREN"),
        ("WULF","TeraWulf"), ("CORZ","Core Scientific"), ("CRCL","Circle Internet Group"),
        ("BKKT","Bakkt"), ("HIVE","HIVE Digital"), ("BTDR","Bitdeer Technologies"),
        ("BTCS","BTCS Inc"), ("CAN","Canaan"), ("EBON","Ebang International"),
        ("APLD","Applied Digital"), ("GREE","Greenidge Generation"), ("ANY","Sphere 3D"),
        ("LMFA","LM Funding America"), ("ARBK","Argo Blockchain"), ("GLXY","Galaxy Digital"),
    ]),
    ("Biotech & Genomics", [
        ("CRSP","CRISPR Therapeutics"), ("EDIT","Editas Medicine"), ("BEAM","Beam Therapeutics"),
        ("NTLA","Intellia Therapeutics"), ("PRME","Prime Medicine"), ("IONS","Ionis Pharmaceuticals"),
        ("ALNY","Alnylam Pharmaceuticals"), ("REGN","Regeneron"), ("MRNA","Moderna"),
        ("BNTX","BioNTech"), ("VRTX","Vertex Pharmaceuticals"), ("HALO","Halozyme Therapeutics"),
        ("ARWR","Arrowhead Pharmaceuticals"), ("INSM","Insmed"), ("RXRX","Recursion Pharmaceuticals"),
        ("BMRN","BioMarin Pharmaceutical"), ("ILMN","Illumina"), ("NTRA","Natera"),
        ("TXG","10x Genomics"), ("PACB","Pacific Biosciences"), ("GH","Guardant Health"),
        ("DNA","Ginkgo Bioworks"), ("TWST","Twist Bioscience"), ("SANA","Sana Biotechnology"),
    ]),
    ("Pharma & MedTech", [
        ("JNJ","Johnson & Johnson"), ("PFE","Pfizer"), ("LLY","Eli Lilly"),
        ("ABBV","AbbVie"), ("BMY","Bristol Myers Squibb"), ("MRK","Merck"),
        ("NVO","Novo Nordisk"), ("AZN","AstraZeneca"), ("ISRG","Intuitive Surgical"),
        ("MDT","Medtronic"), ("EW","Edwards Lifesciences"), ("SYK","Stryker"),
        ("BSX","Boston Scientific"), ("DXCM","Dexcom"), ("PODD","Insulet"),
        ("BDX","Becton Dickinson"), ("ZBH","Zimmer Biomet"), ("INMD","InMode"),
        ("AMGN","Amgen"), ("GILD","Gilead Sciences"), ("UNH","UnitedHealth Group"),
        ("ABT","Abbott Laboratories"), ("TMO","Thermo Fisher Scientific"), ("DHR","Danaher"),
    ]),
    ("EV, Battery & Autonomy", [
        ("TSLA","Tesla"), ("RIVN","Rivian"), ("LCID","Lucid Group"),
        ("NIO","NIO"), ("LI","Li Auto"), ("XPEV","XPeng"),
        ("QS","QuantumScape"), ("EVGO","EVgo"), ("BLNK","Blink Charging"),
        ("CHPT","ChargePoint"), ("ALB","Albemarle"), ("SQM","SQM"),
        ("LAC","Lithium Americas"), ("SES","SES AI"), ("SLI","Standard Lithium"),
        ("MP","MP Materials"), ("LEA","Lear"), ("MGA","Magna International"),
        ("MBLY","Mobileye"), ("SLDP","Solid Power"), ("AUR","Aurora Innovation"),
        ("ENVX","Enovix"), ("ACHR","Archer Aviation"), ("JOBY","Joby Aviation"),
    ]),
    ("Space & Satellites", [
        ("RKLB","Rocket Lab"), ("ASTS","AST SpaceMobile"), ("LUNR","Intuitive Machines"),
        ("SPCX","SpaceX"), ("SPCE","Virgin Galactic"), ("RDW","Redwire"), ("IRDM","Iridium Communications"),
        ("VSAT","Viasat"), ("GSAT","Globalstar"), ("BKSY","BlackSky Technology"),
        ("SPIR","Spire Global"), ("PL","Planet Labs"), ("SATL","Satellogic"),
        ("MNTS","Momentus"), ("KTOS","Kratos Defense"), ("LHX","L3Harris"),
        ("NOC","Northrop Grumman"), ("BA","Boeing"), ("TDY","Teledyne"),
        ("HEI","HEICO"), ("ATRO","Astronics"), ("GILT","Gilat Satellite Networks"),
        ("SATS","EchoStar"), ("RCAT","Red Cat Holdings"), ("PDYN","Palladyne AI"),
    ]),
    ("Defense & Aerospace", [
        ("LMT","Lockheed Martin"), ("NOC","Northrop Grumman"), ("RTX","RTX Corp"),
        ("GD","General Dynamics"), ("BA","Boeing"), ("LHX","L3Harris"),
        ("HII","Huntington Ingalls"), ("TDY","Teledyne"), ("KTOS","Kratos Defense"),
        ("HEI","HEICO"), ("LDOS","Leidos"), ("CACI","CACI International"),
        ("BAH","Booz Allen Hamilton"), ("SAIC","SAIC"), ("BWXT","BWX Technologies"),
        ("AXON","Axon Enterprise"), ("AVAV","AeroVironment"), ("DRS","Leonardo DRS"),
        ("MRCY","Mercury Systems"), ("TXT","Textron"), ("CW","Curtiss-Wright"),
        ("AIR","AAR Corp"), ("HWM","Howmet Aerospace"), ("OSK","Oshkosh"),
    ]),
    ("Robotics & Automation", [
        ("TER","Teradyne"), ("AZTA","Azenta"), ("NOVT","Novanta"),
        ("RRX","Regal Rexnord"), ("EMR","Emerson Electric"), ("ROK","Rockwell Automation"),
        ("PH","Parker Hannifin"), ("HON","Honeywell"), ("IR","Ingersoll Rand"),
        ("SYM","Symbotic"), ("SERV","Serve Robotics"), ("ACMR","ACM Research"),
        ("FORM","FormFactor"), ("COHU","Cohu"), ("ONTO","Onto Innovation"),
        ("ENTG","Entegris"), ("AEIS","Advanced Energy Industries"), ("CGNX","Cognex"),
        ("ZBRA","Zebra Technologies"), ("IOT","Samsara"), ("KSCP","Knightscope"),
        ("ISRG","Intuitive Surgical"), ("DE","Deere & Company"), ("AME","AMETEK"),
    ]),
    ("Photonics & Optical", [
        ("COHR","Coherent"), ("LITE","Lumentum"), ("VIAV","Viavi Solutions"),
        ("LPTH","LightPath Technologies"), ("AAOI","Applied Optoelectronics"), ("LSCC","Lattice Semiconductor"),
        ("INVZ","Innoviz Technologies"), ("OUST","Ouster"), ("AEVA","Aeva Technologies"),
        ("MVIS","MicroVision"), ("IPGP","IPG Photonics"), ("MTSI","MACOM Technology Solutions"),
        ("MKSI","MKS Instruments"), ("CRUS","Cirrus Logic"), ("CIEN","Ciena"),
        ("OSIS","OSI Systems"), ("HIMX","Himax Technologies"), ("AXTI","AXT Inc"),
        ("POET","POET Technologies"), ("OLED","Universal Display"), ("GLW","Corning"),
        ("APH","Amphenol"), ("TEL","TE Connectivity"), ("NVTS","Navitas Semiconductor"),
    ]),
    ("Nuclear & Uranium", [
        ("CCJ","Cameco"), ("NXE","NexGen Energy"), ("DNN","Denison Mines"),
        ("EU","enCore Energy"), ("UUUU","Energy Fuels"), ("URG","Ur-Energy"),
        ("UEC","Uranium Energy"), ("LEU","Centrus Energy"), ("BWXT","BWX Technologies"),
        ("SMR","NuScale Power"), ("OKLO","Oklo"), ("CEG","Constellation Energy"),
        ("VST","Vistra"), ("ETR","Entergy"), ("EXC","Exelon"),
        ("GEV","GE Vernova"), ("LTBR","Lightbridge"), ("BHP","BHP Group"),
        ("RIO","Rio Tinto"), ("UROY","Uranium Royalty"), ("NNE","Nano Nuclear Energy"),
        ("ASPI","ASP Isotopes"), ("TLN","Talen Energy"), ("NRG","NRG Energy"),
    ]),
    ("Clean Energy & Solar", [
        ("ENPH","Enphase Energy"), ("SEDG","SolarEdge"), ("FSLR","First Solar"),
        ("RUN","Sunrun"), ("ARRY","Array Technologies"), ("CSIQ","Canadian Solar"),
        ("HASI","HA Sustainable Infrastructure"), ("NEE","NextEra Energy"), ("CWEN","Clearway Energy"),
        ("BEPC","Brookfield Renewable Corporation"), ("ORA","Ormat Technologies"), ("PLUG","Plug Power"),
        ("FCEL","FuelCell Energy"), ("BE","Bloom Energy"), ("RNW","ReNew Energy Global"),
        ("SHLS","Shoals Technologies"), ("STEM","Stem"), ("FLNC","Fluence Energy"),
        ("BEP","Brookfield Renewable Partners"), ("EOSE","Eos Energy Enterprises"), ("SPRU","Spruce Power"),
        ("NXT","Nextracker"), ("DQ","Daqo New Energy"), ("JKS","JinkoSolar"),
    ]),
    ("Power & Data Centers", [
        ("VRT","Vertiv Holdings"), ("ETN","Eaton"), ("HUBB","Hubbell"),
        ("GEV","GE Vernova"), ("PWR","Quanta Services"), ("FIX","Comfort Systems USA"),
        ("EQIX","Equinix"), ("DLR","Digital Realty"), ("SMCI","Super Micro Computer"),
        ("CLS","Celestica"), ("DELL","Dell Technologies"), ("HPE","Hewlett Packard Enterprise"),
        ("TT","Trane Technologies"), ("CARR","Carrier Global"), ("POWL","Powell Industries"),
        ("VST","Vistra"), ("CEG","Constellation Energy"), ("ANET","Arista Networks"),
        ("POWI","Power Integrations"), ("MYRG","MYR Group"), ("TLN","Talen Energy"),
        ("NRG","NRG Energy"), ("MOD","Modine Manufacturing"), ("JBL","Jabil"),
        ("FLEX","Flex"),
    ]),
    ("Consumer & E-commerce", [
        ("AMZN","Amazon"), ("EBAY","eBay"), ("ETSY","Etsy"),
        ("SHOP","Shopify"), ("WMT","Walmart"), ("TGT","Target"),
        ("COST","Costco"), ("HD","Home Depot"), ("LOW","Lowe's"),
        ("MELI","MercadoLibre"), ("SE","Sea Limited"), ("CPNG","Coupang"),
        ("W","Wayfair"), ("CHWY","Chewy"), ("BABA","Alibaba"),
        ("JD","JD.com"), ("PDD","PDD Holdings"), ("DKNG","DraftKings"),
        ("DASH","DoorDash"), ("MCD","McDonald's"), ("SBUX","Starbucks"),
        ("CMG","Chipotle Mexican Grill"), ("YUM","Yum! Brands"), ("DPZ","Domino's Pizza"),
        ("ELF","e.l.f. Beauty"),
    ]),
    ("Traditional Finance", [
        ("JPM","JPMorgan Chase"), ("BAC","Bank of America"), ("WFC","Wells Fargo"),
        ("GS","Goldman Sachs"), ("MS","Morgan Stanley"), ("C","Citigroup"),
        ("BLK","BlackRock"), ("AXP","American Express"), ("V","Visa"),
        ("MA","Mastercard"), ("COF","Capital One"), ("SCHW","Charles Schwab"),
        ("SYF","Synchrony Financial"), ("ALLY","Ally Financial"), ("FITB","Fifth Third Bancorp"),
        ("KEY","KeyCorp"), ("RF","Regions Financial"), ("CFG","Citizens Financial"),
        ("HBAN","Huntington Bancshares"), ("PNC","PNC Financial"), ("PGR","Progressive"),
        ("TRV","Travelers"), ("ALL","Allstate"), ("MET","MetLife"),
        ("PRU","Prudential Financial"),
    ]),
    ("Real Estate & REITs", [
        ("AMT","American Tower"), ("PLD","Prologis"), ("EQIX","Equinix"),
        ("CCI","Crown Castle"), ("SPG","Simon Property"), ("PSA","Public Storage"),
        ("EQR","Equity Residential"), ("AVB","AvalonBay Communities"), ("WELL","Welltower"),
        ("VTR","Ventas"), ("O","Realty Income"), ("STAG","STAG Industrial"),
        ("IIPR","Innovative Industrial Properties"), ("REXR","Rexford Industrial Realty"), ("EXR","Extra Space Storage"),
        ("CUBE","CubeSmart"), ("IRM","Iron Mountain"), ("COLD","Americold Realty"),
        ("DLR","Digital Realty"), ("SBAC","SBA Communications"), ("DHI","D.R. Horton"),
        ("LEN","Lennar"), ("PHM","PulteGroup"), ("NVR","NVR"),
        ("TOL","Toll Brothers"),
    ]),
    ("Travel & Hospitality", [
        ("DAL","Delta Air Lines"), ("UAL","United Airlines"), ("AAL","American Airlines"),
        ("LUV","Southwest Airlines"), ("ALK","Alaska Air"), ("JBLU","JetBlue"),
        ("RYAAY","Ryanair ADR"), ("EXPE","Expedia"), ("BKNG","Booking Holdings"),
        ("ABNB","Airbnb"), ("MAR","Marriott International"), ("HLT","Hilton Worldwide"),
        ("H","Hyatt Hotels"), ("IHG","IHG Hotels & Resorts"), ("WH","Wyndham Hotels"),
        ("TNL","Travel + Leisure"), ("VAC","Marriott Vacations"), ("NCLH","Norwegian Cruise Line"),
        ("CCL","Carnival"), ("RCL","Royal Caribbean"), ("CHH","Choice Hotels"),
        ("WYNN","Wynn Resorts"), ("LVS","Las Vegas Sands"), ("MGM","MGM Resorts"),
        ("TRIP","Tripadvisor"),
    ]),
    ("Quantum Computing", [
        ("IONQ","IonQ"), ("RGTI","Rigetti Computing"), ("QUBT","Quantum Computing Inc"),
        ("ARQQ","Arqit Quantum"), ("QBTS","D-Wave Quantum"), ("LAES","SEALSQ"),
        ("QSI","Quantum-Si"), ("IBM","IBM"), ("GOOG","Alphabet"),
        ("HON","Honeywell"), ("MSFT","Microsoft"), ("INTC","Intel"),
        ("AMZN","Amazon"), ("NVDA","NVIDIA"), ("AMAT","Applied Materials"),
        ("ACN","Accenture"),
    ]),
    ("Industrials & Materials", [
        ("CENX","Century Aluminum"), ("STRL","Sterling Infrastructure"), ("CAT","Caterpillar"),
        ("DE","Deere & Company"), ("GE","GE Aerospace"), ("DOW","Dow"),
        ("LYB","LyondellBasell"), ("NUE","Nucor"), ("STLD","Steel Dynamics"),
        ("AA","Alcoa"), ("FCX","Freeport-McMoRan"), ("NEM","Newmont"),
        ("CF","CF Industries"), ("MOS","Mosaic"), ("APD","Air Products and Chemicals"),
        ("LIN","Linde"), ("VMC","Vulcan Materials"), ("MLM","Martin Marietta Materials"),
        ("URI","United Rentals"), ("EXP","Eagle Materials"), ("CLF","Cleveland-Cliffs"),
        ("MMM","3M"), ("DD","DuPont"), ("EMN","Eastman Chemical"),
    ]),
    ("Oil & Gas / Energy", [
        ("XOM","ExxonMobil"), ("CVX","Chevron"), ("SHEL","Shell ADR"),
        ("TTE","TotalEnergies ADR"), ("BP","BP ADR"), ("COP","ConocoPhillips"),
        ("EOG","EOG Resources"), ("OXY","Occidental Petroleum"), ("FANG","Diamondback Energy"),
        ("DVN","Devon Energy"), ("EQT","EQT"), ("CNQ","Canadian Natural Resources"),
        ("SU","Suncor Energy"), ("SLB","SLB"), ("HAL","Halliburton"),
        ("BKR","Baker Hughes"), ("VLO","Valero Energy"), ("MPC","Marathon Petroleum"),
        ("PSX","Phillips 66"), ("LNG","Cheniere Energy"), ("WMB","Williams Companies"),
        ("KMI","Kinder Morgan"), ("TRGP","Targa Resources"), ("OKE","ONEOK"),
        ("ENB","Enbridge"),
    ]),
    ("Mobility & Logistics", [
        ("UBER","Uber Technologies"), ("LYFT","Lyft"), ("GRAB","Grab Holdings"),
        ("DASH","DoorDash"), ("FDX","FedEx"), ("UPS","United Parcel Service"),
        ("XPO","XPO"), ("ODFL","Old Dominion Freight Line"), ("JBHT","J.B. Hunt"),
        ("CHRW","C.H. Robinson"), ("KNX","Knight-Swift Transportation"), ("SAIA","Saia"),
        ("RXO","RXO"), ("LSTR","Landstar System"), ("GXO","GXO Logistics"),
        ("EXPD","Expeditors International"), ("SKYW","SkyWest"), ("JOBY","Joby Aviation"),
        ("ACHR","Archer Aviation"), ("EVTL","Vertical Aerospace"), ("ULCC","Frontier Group"),
        ("ALGT","Allegiant Travel"), ("HTZ","Hertz Global"), ("CAR","Avis Budget Group"),
    ]),
    ("Media, Telecom & Entertainment", [
        ("DIS","Walt Disney"), ("NFLX","Netflix"), ("WBD","Warner Bros Discovery"),
        ("PSKY","Paramount Skydance"), ("CMCSA","Comcast"), ("T","AT&T"),
        ("VZ","Verizon"), ("TMUS","T-Mobile US"), ("CHTR","Charter Communications"),
        ("SPOT","Spotify Technology"), ("LYV","Live Nation Entertainment"), ("ROKU","Roku"),
        ("FOXA","Fox"), ("SIRI","Sirius XM"), ("EA","Electronic Arts"),
        ("TTWO","Take-Two Interactive"), ("RBLX","Roblox"), ("PINS","Pinterest"),
        ("SNAP","Snap"), ("TKO","TKO Group"), ("NWSA","News Corp"),
        ("NYT","New York Times"), ("WMG","Warner Music Group"), ("IMAX","IMAX"),
        ("MTCH","Match Group"),
    ]),
    ("Digital Health & Telehealth", [
        ("HIMS","Hims & Hers Health"), ("TDOC","Teladoc Health"), ("OSCR","Oscar Health"),
        ("GDRX","GoodRx"), ("DOCS","Doximity"), ("PGNY","Progyny"),
        ("AMWL","American Well"), ("LFST","LifeStance Health"), ("EVH","Evolent Health"),
        ("OM","Outset Medical"), ("HCAT","Health Catalyst"), ("HQY","HealthEquity"),
        ("CLOV","Clover Health"), ("ALHC","Alignment Healthcare"), ("TEM","Tempus AI"),
        ("NTRA","Natera"), ("GH","Guardant Health"), ("RMD","ResMed"),
        ("DXCM","Dexcom"), ("PODD","Insulet"), ("RXRX","Recursion Pharmaceuticals"),
        ("SDGR","Schrodinger"), ("CERT","Certara"), ("VEEV","Veeva Systems"),
    ]),
]

BENCHMARKS = [
    {"name": "S&P 500", "ticker": "^GSPC"},
    {"name": "Nasdaq",  "ticker": "^IXIC"},
    {"name": "Dow",     "ticker": "^DJI"},
    {"name": "Intl Developed", "ticker": "EFA"},
]


# ── Supabase HTTP client ──────────────────────────────────────────────────────
class DB:
    def __init__(self, url: str, key: str):
        self.base = url.rstrip("/") + "/rest/v1"
        self.key  = key
        self.rh   = {   # return=representation
            "apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        }
        self.mh   = {   # return=minimal
            "apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        self.ih   = {   # insert, ignore unique-constraint conflicts
            "apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=ignore-duplicates,return=minimal",
        }
        self.uh   = {   # bulk upsert: merge-duplicates, return=minimal
            "apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        }

    def get(self, table: str, params: str = "") -> list:
        r = requests.get(
            f"{self.base}/{table}{'?' + params if params else ''}",
            headers={"apikey": self.key, "Authorization": f"Bearer {self.key}"},
            timeout=15,
        )
        r.raise_for_status()
        return r.json()

    def upsert(self, table: str, data: dict, on_conflict: str) -> list:
        r = requests.post(
            f"{self.base}/{table}?on_conflict={on_conflict}",
            headers=self.rh, json=data, timeout=30,
        )
        r.raise_for_status()
        result = r.json()
        if not result:
            raise ValueError(f"Upsert {table} returned empty")
        return result

    def patch(self, table: str, filters: dict, data: dict) -> list:
        qs = "&".join(f"{k}=eq.{v}" for k, v in filters.items())
        r  = requests.patch(
            f"{self.base}/{table}?{qs}",
            headers=self.rh, json=data, timeout=30,
        )
        r.raise_for_status()
        return r.json()

    def delete_where(self, table: str, col: str, val) -> None:
        requests.delete(
            f"{self.base}/{table}?{col}=eq.{val}",
            headers=self.mh, timeout=30,
        ).raise_for_status()

    def delete_stale_sector_holdings(self, sector_id: int, active_tickers: list[str]) -> None:
        """Remove holdings in a sector that are no longer in the source universe.

        Holdings are upserted instead of delete+insert to avoid a temporary empty
        UI. The missing piece is pruning obsolete rows such as tickers removed
        from the hardcoded universe; do that after the fresh upsert succeeds.
        """
        keep = [t for t in active_tickers if t]
        if not keep:
            return
        keep_list = ",".join(keep)
        requests.delete(
            f"{self.base}/sector_holdings?sector_id=eq.{sector_id}&ticker=not.in.({keep_list})",
            headers=self.mh, timeout=30,
        ).raise_for_status()

    def insert(self, table: str, rows: list) -> None:
        if not rows:
            return
        requests.post(
            f"{self.base}/{table}",
            headers=self.mh, json=rows, timeout=30,
        ).raise_for_status()

    def insert_ignore(self, table: str, rows: list) -> None:
        """Insert, silently skipping rows that violate a unique constraint.

        sector_snapshots.snapshot_date is a real GENERATED ALWAYS column
        (migrate_v4410_snapshot_dedup.sql), backed by a plain unique index
        on (sector_id, snapshot_date). That lets us pass a proper
        on_conflict= target — PostgREST + Prefer: resolution=ignore-duplicates
        now perform true ON CONFLICT DO NOTHING at the database level,
        the same pattern upsert_bulk() already uses.

        (Earlier versions caught a 409 here instead, because the prior
        expression-based index — DATE(synced_at) — couldn't be named in
        on_conflict=. That workaround is gone now that snapshot_date is a
        real column. The 409 catch below is kept only as a defensive
        fallback and should no longer trigger in normal operation.)
        """
        if not rows:
            return
        r = requests.post(
            f"{self.base}/{table}?on_conflict=sector_id,snapshot_date",
            headers=self.ih, json=rows, timeout=30,
        )
        if r.status_code == 409:
            return  # defensive fallback — should be unreachable post-migrate_v4410
        r.raise_for_status()

    def upsert_bulk(self, table: str, rows: list, on_conflict: str) -> None:
        """Upsert a list of rows in one HTTP call (merge-duplicates).
        Replaces the old delete_where + insert pattern — halves DB calls
        and avoids the transient window where holdings were briefly empty."""
        if not rows:
            return
        r = requests.post(
            f"{self.base}/{table}?on_conflict={on_conflict}",
            headers=self.uh, json=rows, timeout=60,
        )
        r.raise_for_status()


# ── Price / return helpers ───────────────────────────────────────────────────
def is_regular_market_open(now: datetime | None = None) -> bool:
    """Return True only during the regular NYSE/Nasdaq cash session.

    Off-hours behaviour deliberately stays unchanged: the sync uses the latest
    daily close. We only substitute a current quote while the regular session is
    actually open, and even then each ticker must report Yahoo marketState=REGULAR.
    """
    ET = ZoneInfo("America/New_York")
    now_et = (now or datetime.now(ET)).astimezone(ET)
    if now_et.weekday() >= 5:
        return False
    market_open = now_et.replace(hour=9, minute=30, second=0, microsecond=0)
    market_close = now_et.replace(hour=16, minute=0, second=0, microsecond=0)
    return market_open <= now_et <= market_close


def chunks(items: list[str], size: int):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def fetch_chart_regular_market_price(ticker: str) -> tuple[str, float | None]:
    """Read Yahoo chart metadata for a ticker.

    The public v8 chart endpoint exposes meta.regularMarketPrice and
    meta.currentTradingPeriod without requiring Yahoo's quote crumb/cookie flow.
    It is slower than a batch quote call, so we use it only as a fallback for
    tickers that did not come back from the batch endpoint.
    """
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
    headers = {"User-Agent": "Mozilla/5.0 (compatible; Eagleview/1.0)"}
    try:
        r = requests.get(
            url,
            params={"range": "1d", "interval": "1d", "includePrePost": "false"},
            headers=headers,
            timeout=15,
        )
        r.raise_for_status()
        result = r.json().get("chart", {}).get("result") or []
        if not result:
            return ticker, None
        meta = result[0].get("meta", {})
        price = meta.get("regularMarketPrice")
        if isinstance(price, (int, float)) and price > 0:
            return ticker, round(float(price), 4)
    except Exception:
        return ticker, None
    return ticker, None


def fetch_regular_market_prices(tickers: list[str]) -> dict[str, float]:
    """Fetch current regular-session prices for EagleView's market-hours anchor.

    We only run this while the US regular session is open. The first attempt uses
    Yahoo's batch quote endpoint and accepts rows only with marketState=REGULAR.
    If that endpoint is blocked/unavailable, we fall back to the public chart
    metadata endpoint per ticker. Off-hours behaviour remains unchanged because
    this function returns {} outside the regular cash session.
    """
    if not tickers or not is_regular_market_open():
        return {}

    symbols = sorted(set(tickers))
    prices: dict[str, float] = {}
    headers = {"User-Agent": "Mozilla/5.0 (compatible; Eagleview/1.0)"}

    for batch in chunks(symbols, 100):
        url = "https://query1.finance.yahoo.com/v7/finance/quote"
        try:
            r = requests.get(
                url,
                params={"symbols": ",".join(batch), "fields": "symbol,regularMarketPrice,marketState"},
                headers=headers,
                timeout=20,
            )
            r.raise_for_status()
            results = r.json().get("quoteResponse", {}).get("result", [])
        except Exception as e:
            log.warning(f"  Batch quote failed ({batch[0]}…{batch[-1]}): {e}; using chart metadata fallback")
            continue

        for q in results:
            symbol = q.get("symbol")
            price = q.get("regularMarketPrice")
            state = q.get("marketState")
            if symbol and isinstance(price, (int, float)) and price > 0 and state == "REGULAR":
                prices[symbol] = round(float(price), 4)

    missing = [t for t in symbols if t not in prices]
    if missing:
        with ThreadPoolExecutor(max_workers=16) as pool:
            futures = [pool.submit(fetch_chart_regular_market_price, t) for t in missing]
            for fut in as_completed(futures):
                symbol, price = fut.result()
                if price is not None:
                    prices[symbol] = price

    return prices


def calc_returns(series: pd.Series, current_override: float | None = None) -> dict:
    if series is None or series.empty:
        return {}
    series = series.dropna()
    if len(series) < 2:
        return {}

    use_live_anchor = current_override is not None and current_override > 0
    current = float(current_override) if use_live_anchor else float(series.iloc[-1])

    # During regular market hours, current_override is a same-day live regular
    # session quote. Denominators should be completed historical closes: 1D means
    # previous regular close, 1W means five completed sessions ago, etc. If the
    # downloaded daily series already contains today's in-progress candle, remove
    # it from the denominator series so the math remains consistent.
    ref_series = series
    if use_live_anchor:
        today_et = datetime.now(ZoneInfo("America/New_York")).date()
        ref_series = series[series.index.date < today_et]
        if ref_series.empty:
            ref_series = series

    # Sanity thresholds for SHORT periods only — genuine day-over-day or
    # week-over-week moves beyond these are exceedingly rare for any real
    # company (even a volatile penny stock) and almost always indicate a
    # stale pre-split "previous close" rather than real price action. A
    # 1-for-N reverse split produces a false jump of ~(N-1)*100%, and an
    # N-for-1 forward split produces a false drop of ~(1-1/N)*100% — both
    # land far outside these thresholds while leaving legitimate huge
    # multi-month/YTD moves (already confirmed real elsewhere in this
    # universe) completely untouched.
    SHORT_PERIOD_CAPS = {1: 100.0, 5: 150.0}  # {days: max abs % swing}

    def pct(days: int):
        if use_live_anchor:
            if len(ref_series) < days:
                return None
            past = float(ref_series.iloc[-days])
        else:
            if len(series) <= days:
                return None
            past = float(series.iloc[-(days + 1)])
        if not past:
            return None
        value = round((current - past) / past * 100, 2)
        cap = SHORT_PERIOD_CAPS.get(days)
        if cap is not None and abs(value) > cap:
            log.warning(
                f"    ⚠ Suspicious {days}-day return {value:+.1f}% "
                f"(|{value:.1f}%| > {cap:.0f}% cap) — likely stale pre-split "
                f"price, discarding as bad data"
            )
            return None
        return value

    year  = datetime.now(ZoneInfo("America/New_York")).year
    ytd_s = ref_series[ref_series.index.year == year] if use_live_anchor else series[series.index.year == year]
    ytd   = None
    if not ytd_s.empty:
        start = float(ytd_s.iloc[0])
        ytd   = round((current - start) / start * 100, 2) if start else None

    result = {
        "day_pct":       pct(1),
        "week_pct":      pct(5),
        "month_pct":     pct(21),
        "quarter_pct":   pct(63),
        "half_year_pct": pct(126),
        "year_pct":      pct(252),
        "five_year_pct": pct(1260),
        "ytd_pct":       ytd,
    }
    return result if any(v is not None for v in result.values()) else {}


def safe_avg(vals: list) -> float | None:
    clean = [v for v in vals if v is not None]
    return round(sum(clean) / len(clean), 2) if clean else None


def breadth(rows: list, key: str) -> int | None:
    total = len([r for r in rows if r.get(key) is not None])
    if total == 0:
        return None
    pos = sum(1 for r in rows if (r.get(key) or 0) >= 0)
    return round(pos / total * 100)


def rank_by(sectors_map: dict, key: str) -> dict:
    """Return {sector_id: rank} sorted by key descending. Null values rank last."""
    ordered = sorted(
        sectors_map.keys(),
        key=lambda sid: sectors_map[sid].get(key) if sectors_map[sid].get(key) is not None else -9999,
        reverse=True,
    )
    return {sid: i + 1 for i, sid in enumerate(ordered)}


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    log.info("══ Eagleview v4.4.32 Data Sync ══")

    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        log.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        sys.exit(1)

    # ── Market-hours guard ────────────────────────────────────────────────────
    # workflow_dispatch (manual trigger) bypasses this gate entirely — useful
    # for weekend testing, post-deployment syncs, and debugging.
    # Scheduled cron runs still enforce market hours.
    is_manual = os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch"
    if is_manual:
        log.info("Manual dispatch — bypassing market hours gate, running full sync")
    else:
        ET          = ZoneInfo("America/New_York")
        et_now      = datetime.now(ET)
        market_open = et_now.replace(hour=9,  minute=15, second=0, microsecond=0)
        market_shut = et_now.replace(hour=17, minute=15, second=0, microsecond=0)
        if not (market_open <= et_now <= market_shut):
            log.info(f"Outside market hours ({et_now.strftime('%a %H:%M %Z')}) — skipping cleanly")
            sys.exit(0)
        log.info(f"Market hours confirmed ({et_now.strftime('%H:%M %Z, %Z offset from UTC')})")

    db = DB(url, key)

    # ── Connectivity check ────────────────────────────────────────────────────
    try:
        db.get("sectors", "limit=1")
        log.info("DB connection OK")
    except Exception as e:
        log.error(f"DB connection FAILED: {e}")
        sys.exit(1)

    # ══════════════════════════════════════════════════════════════════════════
    # PHASE 1 — Read current DB state (for rank deltas + previous values)
    # ══════════════════════════════════════════════════════════════════════════
    log.info("── Phase 1: Reading current DB state ──")
    try:
        old_rows = db.get(
            "sectors",
            "select=id,name,day_pct,week_pct,month_pct,quarter_pct,half_year_pct,year_pct,five_year_pct,ytd_pct,"
            "day_rank,week_rank,month_rank,quarter_rank,half_year_rank,year_rank,five_year_rank,ytd_rank,streak",
        )
        old_state = {row["id"]: row for row in old_rows}
        log.info(f"  Read {len(old_state)} existing sector rows")
    except Exception as e:
        log.warning(f"  Could not read old state (first run?): {e}")
        old_state = {}

    # Pre-compute old ranks (needed for delta calculation later)
    old_day_ranks          = rank_by(old_state, "day_pct")
    old_ytd_ranks          = rank_by(old_state, "ytd_pct")
    old_week_ranks         = rank_by(old_state, "week_pct")
    old_month_ranks        = rank_by(old_state, "month_pct")
    old_quarter_ranks      = rank_by(old_state, "quarter_pct")
    old_half_year_ranks    = rank_by(old_state, "half_year_pct")
    old_year_ranks         = rank_by(old_state, "year_pct")
    old_five_year_ranks    = rank_by(old_state, "five_year_pct")

    # ══════════════════════════════════════════════════════════════════════════
    # PHASE 2 — Batch download all tickers
    # ══════════════════════════════════════════════════════════════════════════
    log.info("── Phase 2: Downloading market data ──")
    all_tickers = list(
        {t for _, stocks in SECTOR_STOCKS for t, _ in stocks}
        | {b["ticker"] for b in BENCHMARKS}
    )
    log.info(f"  {len(all_tickers)} unique tickers")

    closes = None
    for attempt in range(1, 4):
        try:
            # period="1y" once returned ~251 trading days — not enough for pct(252),
            # which needs len(series) > 252 (253+ rows). That bug silently broke
            # year_pct for every ticker. Lesson applied here: 5Y needs pct(1260),
            # requiring 1261+ rows. period="6y" gives ~1512 trading days — a clean
            # ~250-day buffer over the minimum, so we never repeat that mistake.
            raw    = yf.download(all_tickers, period="6y", progress=False, auto_adjust=True)
            closes = (
                raw["Close"]
                if isinstance(raw.columns, pd.MultiIndex)
                else raw[["Close"]].rename(columns={"Close": all_tickers[0]})
            )
            log.info(f"  Downloaded {closes.shape[0]} days × {closes.shape[1]} tickers (attempt {attempt})")
            break
        except Exception as e:
            log.warning(f"  Download attempt {attempt}/3 failed: {e}")
            if attempt < 3:
                time.sleep(15 * attempt)   # 15s, then 30s
    if closes is None:
        log.error("  All download attempts failed — aborting")
        sys.exit(1)

    regular_market_prices = fetch_regular_market_prices(all_tickers)
    if regular_market_prices:
        log.info(f"  Current regular-session prices collected: {len(regular_market_prices)} tickers")
    else:
        log.info("  Off-hours or no REGULAR quotes available — using latest daily close anchors")

    ticker_returns: dict[str, dict] = {
        t: (calc_returns(closes[t], regular_market_prices.get(t)) if t in closes.columns else {})
        for t in all_tickers}

    missing = [t for t, r in ticker_returns.items() if not r]
    if missing:
        log.warning(f"  No data for: {missing}")

    # ══════════════════════════════════════════════════════════════════════════
    # PHASE 3 — Ensure all sector rows exist + compute per-sector data
    # ══════════════════════════════════════════════════════════════════════════
    # Build latest display price map — during regular market hours this uses
    # Yahoo regularMarketPrice; off-hours it stays with the existing daily-close
    # behaviour. This keeps displayed price and performance math on the same
    # sync-time anchor without introducing pre/post-market prices.
    price_map: dict[str, float] = dict(regular_market_prices)
    for t in all_tickers:
        if t in price_map:
            continue
        if t in closes.columns:
            series = closes[t].dropna()
            if not series.empty:
                price_map[t] = round(float(series.iloc[-1]), 4)
    log.info(f"  Prices collected: {len(price_map)} tickers")

    log.info("── Phase 3: Computing sector returns & breadth ──")

    # Map: sector_name → computed data
    sector_computed: dict[str, dict] = {}

    for sector_name, stocks in SECTOR_STOCKS:
        try:
            # Ensure sector exists in DB, get id
            rows      = db.upsert("sectors", {
                "name":       sector_name,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }, "name")
            sector_id = rows[0]["id"]

            # Per-stock returns
            stock_rows = []
            for ticker, company in stocks:
                ret = ticker_returns.get(ticker, {})
                if ret:
                    row = {
                        "sector_id":    sector_id,
                        "ticker":       ticker,
                        "company_name": company,
                        **ret,
                    }
                    # Add latest closing price from pre-built price_map
                    if ticker in price_map:
                        row["price"] = price_map[ticker]
                    stock_rows.append(row)

            # Equal-weighted sector averages
            rets = {
                "day_pct":     safe_avg([s.get("day_pct")     for s in stock_rows]),
                "week_pct":    safe_avg([s.get("week_pct")    for s in stock_rows]),
                "month_pct":   safe_avg([s.get("month_pct")   for s in stock_rows]),
                "quarter_pct":    safe_avg([s.get("quarter_pct")    for s in stock_rows]),
                "half_year_pct":  safe_avg([s.get("half_year_pct")  for s in stock_rows]),
                "year_pct":       safe_avg([s.get("year_pct")       for s in stock_rows]),
                "five_year_pct":  safe_avg([s.get("five_year_pct")  for s in stock_rows]),
                "ytd_pct":        safe_avg([s.get("ytd_pct")        for s in stock_rows]),
            }

            # Breadth (% of stocks with positive return for each period)
            sector_computed[sector_name] = {
                "sector_id":   sector_id,
                "stock_rows":  stock_rows,
                "rets":        rets,
                "stock_count": len(stock_rows),
                "active_tickers": [row["ticker"] for row in stock_rows],
                "breadth_1d":  breadth(stock_rows, "day_pct"),
                "breadth_1w":  breadth(stock_rows, "week_pct"),
                "breadth_1m":  breadth(stock_rows, "month_pct"),
                "breadth_3m":  breadth(stock_rows, "quarter_pct"),
                "breadth_6m":  breadth(stock_rows, "half_year_pct"),
                "breadth_1y":  breadth(stock_rows, "year_pct"),
                "breadth_5y":  breadth(stock_rows, "five_year_pct"),
                "breadth_ytd": breadth(stock_rows, "ytd_pct"),
            }
        except Exception as e:
            log.error(f"  Phase 3 failed for {sector_name}: {e}")

    log.info(f"  Computed {len(sector_computed)}/{len(SECTOR_STOCKS)} sectors")

    # ══════════════════════════════════════════════════════════════════════════
    # PHASE 4 — Compute ranks across ALL sectors simultaneously
    # ══════════════════════════════════════════════════════════════════════════
    log.info("── Phase 4: Computing cross-sector ranks ──")

    # Build id→returns map for ranking
    returns_by_id = {
        sc["sector_id"]: sc["rets"]
        for sc in sector_computed.values()
    }
    new_day_ranks          = rank_by(returns_by_id, "day_pct")
    new_ytd_ranks          = rank_by(returns_by_id, "ytd_pct")
    new_week_ranks         = rank_by(returns_by_id, "week_pct")
    new_month_ranks        = rank_by(returns_by_id, "month_pct")
    new_quarter_ranks      = rank_by(returns_by_id, "quarter_pct")
    new_half_year_ranks    = rank_by(returns_by_id, "half_year_pct")
    new_year_ranks         = rank_by(returns_by_id, "year_pct")
    new_five_year_ranks    = rank_by(returns_by_id, "five_year_pct")

    # ══════════════════════════════════════════════════════════════════════════
    # PHASE 5 & 6 — Compute deltas/streaks + write to DB
    # ══════════════════════════════════════════════════════════════════════════
    log.info("── Phase 5/6: Saving snapshots + writing new state ──")

    sector_ok, sector_fail = 0, []

    for sector_name, sc in sector_computed.items():
        sector_id = sc["sector_id"]
        rets      = sc["rets"]
        old       = old_state.get(sector_id, {})

        # ── Save snapshot of OLD state (before overwriting) ──────────────────
        # Isolated from the critical write below: a snapshot failure (e.g. a
        # same-day duplicate) must NEVER prevent sectors.updated_at from
        # refreshing. insert_ignore() also makes same-day re-attempts no-ops
        # (ON CONFLICT DO NOTHING) instead of raising 409s.
        if old.get("ytd_pct") is not None:
            try:
                db.insert_ignore("sector_snapshots", [{
                    "sector_id":    sector_id,
                    "day_pct":      old.get("day_pct"),
                    "week_pct":     old.get("week_pct"),
                    "month_pct":    old.get("month_pct"),
                    "quarter_pct":  old.get("quarter_pct"),
                    "half_year_pct":   old.get("half_year_pct"),
                    "year_pct":        old.get("year_pct"),
                    "five_year_pct":   old.get("five_year_pct"),
                    "ytd_pct":      old.get("ytd_pct"),
                    "day_rank":     old.get("day_rank") or old_day_ranks.get(sector_id),
                    "ytd_rank":     old.get("ytd_rank") or old_ytd_ranks.get(sector_id),
                    "week_rank":    old.get("week_rank") or old_week_ranks.get(sector_id),
                    "month_rank":   old.get("month_rank") or old_month_ranks.get(sector_id),
                    "quarter_rank":     old.get("quarter_rank") or old_quarter_ranks.get(sector_id),
                    "half_year_rank":   old.get("half_year_rank") or old_half_year_ranks.get(sector_id),
                    "year_rank":        old.get("year_rank") or old_year_ranks.get(sector_id),
                    "five_year_rank":   old.get("five_year_rank") or old_five_year_ranks.get(sector_id),
                    "breadth_6m":   sc.get("breadth_6m"),
                    "breadth_1y":   sc.get("breadth_1y"),
                    "breadth_5y":   sc.get("breadth_5y"),
                    "streak":       old.get("streak", 0),
                }])
            except Exception as e:
                log.warning(f"  ⚠ {sector_name}: snapshot save skipped — {e}")

        try:
            # Rank deltas: positive = moved UP, 0 for first sync (no previous data)
            def rank_delta(old_ranks, new_ranks, sid):
                old_r = old_ranks.get(sid)
                new_r = new_ranks.get(sid, 0)
                # If sector had no previous return data, it's a first-data sync
                # Ranking from NULL to a real rank is not a meaningful movement
                had_prev_data = old_state.get(sid, {}).get("ytd_pct") is not None
                if old_r is None or not had_prev_data:
                    return 0
                return old_r - new_r

            # Streak: consecutive syncs where YTD is positive
            ytd_positive = rets.get("ytd_pct") is not None and rets["ytd_pct"] >= 0
            old_streak   = old.get("streak") or 0
            new_streak   = (old_streak + 1) if ytd_positive else 0

            # New ranks for this sector
            new_day_rank          = new_day_ranks.get(sector_id)
            new_ytd_rank          = new_ytd_ranks.get(sector_id)
            new_week_rank         = new_week_ranks.get(sector_id)
            new_month_rank        = new_month_ranks.get(sector_id)
            new_quarter_rank      = new_quarter_ranks.get(sector_id)
            new_half_year_rank    = new_half_year_ranks.get(sector_id)
            new_year_rank         = new_year_ranks.get(sector_id)
            new_five_year_rank    = new_five_year_ranks.get(sector_id)

            # Patch: write all new data in one call
            patch_result = db.patch("sectors", {"id": sector_id}, {
                # Returns
                **rets,
                # Note: half_year_pct comes from rets via **rets
                "stock_count":    sc["stock_count"],
                # Ranks
                "day_rank":          new_day_rank,
                "ytd_rank":          new_ytd_rank,
                "week_rank":         new_week_rank,
                "month_rank":        new_month_rank,
                "quarter_rank":      new_quarter_rank,
                "half_year_rank":    new_half_year_rank,
                "year_rank":         new_year_rank,
                "five_year_rank":    new_five_year_rank,
                # Rank deltas
                "day_rank_change":     rank_delta(old_day_ranks,     new_day_ranks,     sector_id),
                "ytd_rank_change":     rank_delta(old_ytd_ranks,     new_ytd_ranks,     sector_id),
                "week_rank_change":    rank_delta(old_week_ranks,    new_week_ranks,    sector_id),
                "month_rank_change":   rank_delta(old_month_ranks,   new_month_ranks,   sector_id),
                "quarter_rank_change":      rank_delta(old_quarter_ranks,   new_quarter_ranks,   sector_id),
                "half_year_rank_change":    rank_delta(old_half_year_ranks, new_half_year_ranks, sector_id),
                "year_rank_change":         rank_delta(old_year_ranks,      new_year_ranks,      sector_id),
                "five_year_rank_change":    rank_delta(old_five_year_ranks, new_five_year_ranks, sector_id),
                # Streak
                "streak": new_streak,
                # Breadth
                "breadth_1d":  sc["breadth_1d"],
                "breadth_1w":  sc["breadth_1w"],
                "breadth_1m":  sc["breadth_1m"],
                "breadth_3m":  sc["breadth_3m"],
                "breadth_6m":  sc["breadth_6m"],
                "breadth_1y":  sc["breadth_1y"],
                "breadth_5y":  sc["breadth_5y"],
                "breadth_ytd": sc["breadth_ytd"],
                # Previous values (for momentum delta in UI)
                "prev_day_pct":     old.get("day_pct"),
                "prev_week_pct":    old.get("week_pct"),
                "prev_month_pct":   old.get("month_pct"),
                "prev_quarter_pct":    old.get("quarter_pct"),
                "prev_half_year_pct":  old.get("half_year_pct"),
                "prev_year_pct":       old.get("year_pct"),
                "prev_five_year_pct":  old.get("five_year_pct"),
                "prev_ytd_pct":        old.get("ytd_pct"),
                "updated_at":       datetime.now(timezone.utc).isoformat(),
            })

            # Verify write
            saved_ytd = patch_result[0].get("ytd_pct") if patch_result else None
            ok_mark   = "✓" if saved_ytd is not None else "⚠ ytd_pct=NULL"

            log.info(
                f"  {sector_name[:28]:28s} | "
                f"#{new_ytd_rank:2d} "
                f"({'▲' if rank_delta(old_ytd_ranks, new_ytd_ranks, sector_id) > 0 else '▼' if rank_delta(old_ytd_ranks, new_ytd_ranks, sector_id) < 0 else '='}"
                f"{abs(rank_delta(old_ytd_ranks, new_ytd_ranks, sector_id))}) | "
                f"YTD={rets.get('ytd_pct')}% | "
                f"breadth={sc['breadth_ytd']}% | "
                f"streak={new_streak} | {ok_mark}"
            )

            # Refresh individual stock rows — one upsert per sector instead of
            # delete+insert, halving DB calls and removing the transient empty-window.
            # Then prune obsolete holdings for the sector so old universe entries
            # do not linger with stale prices/performance.
            if sc["stock_rows"]:
                db.upsert_bulk("sector_holdings", sc["stock_rows"], "sector_id,ticker")
                db.delete_stale_sector_holdings(sector_id, sc.get("active_tickers", []))

            sector_ok += 1

        except Exception as e:
            log.error(f"  ✗ {sector_name}: {e}")
            sector_fail.append(sector_name)

    # ── Benchmarks ────────────────────────────────────────────────────────────
    log.info("── Benchmarks ──")
    for bm in BENCHMARKS:
        r = ticker_returns.get(bm["ticker"], {})
        try:
            db.upsert("benchmarks", {
                "name": bm["name"], "ticker": bm["ticker"],
                **r, "updated_at": datetime.now(timezone.utc).isoformat(),
            }, "ticker")
            log.info(f"  ✓ {bm['name']}  1W={r.get('week_pct')}%  YTD={r.get('ytd_pct')}%")
        except Exception as e:
            log.error(f"  ✗ {bm['name']}: {e}")

    log.info(f"══ Done: {sector_ok}/{len(SECTOR_STOCKS)} sectors ══")
    if sector_fail:
        log.warning(f"Failed: {sector_fail}")
        sys.exit(1)


if __name__ == "__main__":
    main()
