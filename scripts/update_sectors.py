#!/usr/bin/env python3
"""
Eagleview v2 — Data Updater
============================
Custom 20-stock baskets per sector.
Batch-downloads all tickers at once via yfinance for speed.
Calculates equal-weighted sector returns.
Writes per-stock AND sector-level data to Supabase via plain HTTP.

Env vars:
  SUPABASE_URL          project URL (no trailing slash, no /rest/v1)
  SUPABASE_SERVICE_KEY  service_role key (legacy eyJ... format)
"""

import os, sys, logging
from datetime import datetime

import requests
import pandas as pd
import yfinance as yf

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Curated 20-stock baskets ──────────────────────────────────────────────────
SECTOR_STOCKS = [
    ("Semiconductors", [
        ("NVDA","NVIDIA"), ("AMD","Advanced Micro Devices"), ("AVGO","Broadcom"),
        ("TSM","Taiwan Semiconductor"), ("QCOM","Qualcomm"), ("INTC","Intel"),
        ("MU","Micron Technology"), ("AMAT","Applied Materials"), ("LRCX","Lam Research"),
        ("KLAC","KLA Corp"), ("ASML","ASML Holding"), ("TXN","Texas Instruments"),
        ("ADI","Analog Devices"), ("MCHP","Microchip Technology"), ("ON","ON Semiconductor"),
        ("NXPI","NXP Semiconductors"), ("MRVL","Marvell Technology"), ("MPWR","Monolithic Power"),
        ("WOLF","Wolfspeed"), ("SLAB","Silicon Laboratories"),
    ]),
    ("Software & Cloud", [
        ("MSFT","Microsoft"), ("CRM","Salesforce"), ("NOW","ServiceNow"),
        ("SNOW","Snowflake"), ("DDOG","Datadog"), ("MDB","MongoDB"),
        ("HUBS","HubSpot"), ("WDAY","Workday"), ("VEEV","Veeva Systems"),
        ("TEAM","Atlassian"), ("GTLB","GitLab"), ("PATH","UiPath"),
        ("CFLT","Confluent"), ("BILL","Bill.com"), ("DOCN","DigitalOcean"),
        ("ZI","ZoomInfo"), ("PCTY","Paylocity"), ("ESTC","Elastic"),
        ("BOX","Box"), ("U","Unity Software"),
    ]),
    ("Cybersecurity", [
        ("CRWD","CrowdStrike"), ("PANW","Palo Alto Networks"), ("ZS","Zscaler"),
        ("FTNT","Fortinet"), ("S","SentinelOne"), ("OKTA","Okta"),
        ("CYBR","CyberArk Software"), ("TENB","Tenable"), ("RPD","Rapid7"),
        ("QLYS","Qualys"), ("NET","Cloudflare"), ("CHKP","Check Point"),
        ("BAH","Booz Allen Hamilton"), ("CACI","CACI International"), ("LDOS","Leidos"),
        ("SAIC","SAIC"), ("CSCO","Cisco Systems"), ("DXC","DXC Technology"),
        ("EPAM","EPAM Systems"), ("VNET","21Vianet Group"),
    ]),
    ("AI & Machine Learning", [
        ("PLTR","Palantir"), ("AI","C3.ai"), ("BBAI","BigBear.ai"),
        ("SOUN","SoundHound AI"), ("GOOG","Alphabet"), ("META","Meta Platforms"),
        ("IBM","IBM"), ("AMBA","Ambarella"), ("PEGA","Pegasystems"),
        ("NICE","NICE Systems"), ("VRNT","Verint Systems"), ("SDGR","Schrodinger"),
        ("RXRX","Recursion Pharma"), ("ABSI","Absci"), ("GFAI","Guardforce AI"),
        ("AEVA","Aeva Technologies"), ("BFLY","Butterfly Network"),
        ("ASAN","Asana"), ("BRZE","Braze"), ("UPST","Upstart"),
    ]),
    ("Fintech & Insurtech", [
        ("SQ","Block"), ("PYPL","PayPal"), ("HOOD","Robinhood"),
        ("SOFI","SoFi Technologies"), ("AFRM","Affirm"), ("NU","Nu Holdings"),
        ("LMND","Lemonade"), ("ROOT","Root Insurance"), ("MQ","Marqeta"),
        ("RELY","Remitly"), ("TOST","Toast"), ("FLYW","Flywire"),
        ("DAVE","Dave"), ("NRDS","NerdWallet"), ("LC","LendingClub"),
        ("CLOV","Clover Health"), ("FICO","Fair Isaac"), ("WEX","WEX"),
        ("FISV","Fiserv"), ("GPN","Global Payments"),
    ]),
    ("Digital Assets & Crypto", [
        ("COIN","Coinbase"), ("MSTR","MicroStrategy"), ("MARA","Marathon Digital"),
        ("RIOT","Riot Platforms"), ("CLSK","CleanSpark"), ("HUT","Hut 8"),
        ("BTBT","Bit Digital"), ("CIFR","Cipher Mining"), ("BITF","Bitfarms"),
        ("IREN","Iris Energy"), ("WULF","TeraWulf"), ("CORZ","Core Scientific"),
        ("BTCS","BTCS"), ("SMLR","Semler Scientific"), ("BKKT","Bakkt"),
        ("HIVE","HIVE Digital"), ("MIGI","Mawson Infrastructure"), ("ARBK","Argo Blockchain"),
        ("SQ","Block"), ("PYPL","PayPal"),
    ]),
    ("Biotech & Genomics", [
        ("CRSP","CRISPR Therapeutics"), ("EDIT","Editas Medicine"), ("BEAM","Beam Therapeutics"),
        ("NTLA","Intellia Therapeutics"), ("VERV","Verve Therapeutics"),
        ("IONS","Ionis Pharmaceuticals"), ("ALNY","Alnylam Pharmaceuticals"), ("REGN","Regeneron"),
        ("MRNA","Moderna"), ("BNTX","BioNTech"), ("VRTX","Vertex Pharmaceuticals"),
        ("HALO","Halozyme Therapeutics"), ("ARWR","Arrowhead Pharma"), ("DNLI","Denali Therapeutics"),
        ("RCUS","Arcus Biosciences"), ("ACAD","ACADIA Pharma"), ("INSM","Insmed"),
        ("RXRX","Recursion Pharma"), ("BMRN","BioMarin Pharma"), ("GERN","Geron"),
    ]),
    ("Pharma & MedTech", [
        ("JNJ","Johnson & Johnson"), ("PFE","Pfizer"), ("LLY","Eli Lilly"),
        ("ABBV","AbbVie"), ("BMY","Bristol Myers Squibb"), ("MRK","Merck"),
        ("NVO","Novo Nordisk"), ("AZN","AstraZeneca"), ("ISRG","Intuitive Surgical"),
        ("MDT","Medtronic"), ("EW","Edwards Lifesciences"), ("SYK","Stryker"),
        ("BSX","Boston Scientific"), ("DXCM","Dexcom"), ("PODD","Insulet"),
        ("HOLX","Hologic"), ("ZBH","Zimmer Biomet"), ("INMD","InMode"),
        ("TNDM","Tandem Diabetes"), ("SWAV","ShockWave Medical"),
    ]),
    ("Electric Vehicles & Battery", [
        ("TSLA","Tesla"), ("RIVN","Rivian"), ("LCID","Lucid Motors"),
        ("NIO","NIO"), ("LI","Li Auto"), ("XPEV","XPeng"),
        ("QS","QuantumScape"), ("CHPT","ChargePoint"), ("BLNK","Blink Charging"),
        ("EVGO","EVgo"), ("ALB","Albemarle"), ("SQM","SQM"),
        ("LAC","Lithium Americas"), ("PLL","Piedmont Lithium"), ("LTHM","Livent"),
        ("MP","MP Materials"), ("LEA","Lear Corp"), ("MGA","Magna International"),
        ("MVST","Microvast"), ("AMPX","Amprius Technologies"),
    ]),
    ("Space & Satellites", [
        ("RKLB","Rocket Lab"), ("ASTS","AST SpaceMobile"), ("LUNR","Intuitive Machines"),
        ("SPCE","Virgin Galactic"), ("KTOS","Kratos Defense"), ("RDW","Redwire"),
        ("IRDM","Iridium"), ("VSAT","Viasat"), ("GSAT","Globalstar"),
        ("BKSY","BlackSky"), ("SPIR","Spire Global"), ("PL","Planet Labs"),
        ("HEI","HEICO"), ("TDY","Teledyne"), ("ATRO","Astronics"),
        ("SATL","Satellogic"), ("MNTS","Momentus"), ("LHX","L3Harris"),
        ("NOC","Northrop Grumman"), ("BA","Boeing"),
    ]),
    ("Defense & Aerospace", [
        ("LMT","Lockheed Martin"), ("NOC","Northrop Grumman"), ("RTX","RTX Corp"),
        ("GD","General Dynamics"), ("BA","Boeing"), ("LHX","L3Harris"),
        ("HII","Huntington Ingalls"), ("TDY","Teledyne"), ("KTOS","Kratos Defense"),
        ("HEI","HEICO"), ("LDOS","Leidos"), ("CACI","CACI International"),
        ("BAH","Booz Allen Hamilton"), ("SAIC","SAIC"), ("BWXT","BWX Technologies"),
        ("AXON","Axon Enterprise"), ("SWBI","Smith & Wesson Brands"), ("AVAV","AeroVironment"),
        ("DRS","Leonardo DRS"), ("MRCY","Mercury Systems"),
    ]),
    ("Robotics & Automation", [
        ("ABB","ABB Ltd"), ("TER","Teradyne"), ("BRKS","Brooks Automation"),
        ("NOVT","Novanta"), ("RRX","Rexnord"), ("EMR","Emerson Electric"),
        ("ROK","Rockwell Automation"), ("PH","Parker Hannifin"), ("HON","Honeywell"),
        ("IR","Ingersoll Rand"), ("FANUY","Fanuc"), ("NNDM","Nano Dimension"),
        ("DM","Desktop Metal"), ("MTLS","Materialise"), ("ACMR","ACM Research"),
        ("FORM","FormFactor"), ("COHU","Cohu"), ("ONTO","Onto Innovation"),
        ("ENTG","Entegris"), ("AEIS","Advanced Energy Industries"),
    ]),
    ("Photonics & Optical", [
        ("COHR","Coherent Corp"), ("LITE","Lumentum"), ("VIAVI","Viavi Solutions"),
        ("LPTH","LightPath Technologies"), ("AAOI","Applied Optoelectronics"),
        ("LAZR","Luminar Technologies"), ("INVZ","Innoviz Technologies"),
        ("OUST","Ouster"), ("AEVA","Aeva Technologies"), ("MVIS","MicroVision"),
        ("IPGP","IPG Photonics"), ("MTSI","MACOM Technology"), ("MKSI","MKS Instruments"),
        ("CRUS","Cirrus Logic"), ("HLIT","Harmonic"), ("PSIX","Power Solutions Intl"),
        ("OSIS","OSI Systems"), ("HIMX","Himax Technologies"), ("NPKI","NovaBay Pharma"),
        ("LIQT","LiqTech International"),
    ]),
    ("Nuclear & Uranium", [
        ("CCJ","Cameco"), ("NXE","NexGen Energy"), ("DNN","Denison Mines"),
        ("EU","enCore Energy"), ("UUUU","Energy Fuels"), ("URG","Ur-Energy"),
        ("UEC","Uranium Energy"), ("LEU","Centrus Energy"), ("BWXT","BWX Technologies"),
        ("SMR","NuScale Power"), ("OKLO","Oklo"), ("CEG","Constellation Energy"),
        ("VST","Vistra"), ("ETR","Entergy"), ("EXC","Exelon"),
        ("GEV","GE Vernova"), ("LTBR","Lightbridge"), ("BHP","BHP Group"),
        ("RIO","Rio Tinto"), ("PDN","Paladin Energy"),
    ]),
    ("Clean Energy & Solar", [
        ("ENPH","Enphase Energy"), ("SEDG","SolarEdge"), ("FSLR","First Solar"),
        ("RUN","Sunrun"), ("SPWR","SunPower"), ("ARRY","Array Technologies"),
        ("NOVA","Sunnova Energy"), ("HASI","Hannon Armstrong"), ("NEE","NextEra Energy"),
        ("CWEN","Clearway Energy"), ("BEPC","Brookfield Renewable"), ("ORA","Ormat Technologies"),
        ("PLUG","Plug Power"), ("FCEL","FuelCell Energy"), ("BE","Bloom Energy"),
        ("MAXN","Maxeon Solar"), ("SHLS","Shoals Technologies"), ("AMPS","Altus Power"),
        ("FLNC","Fluence Energy"), ("BEP","Brookfield Renewable Partners"),
    ]),
    ("Consumer & E-commerce", [
        ("AMZN","Amazon"), ("EBAY","eBay"), ("ETSY","Etsy"),
        ("SHOP","Shopify"), ("WMT","Walmart"), ("TGT","Target"),
        ("COST","Costco"), ("HD","Home Depot"), ("LOW","Lowe's"),
        ("MELI","MercadoLibre"), ("SE","Sea Limited"), ("CPNG","Coupang"),
        ("W","Wayfair"), ("CHWY","Chewy"), ("BABA","Alibaba"),
        ("JD","JD.com"), ("PDD","PDD Holdings"), ("DKNG","DraftKings"),
        ("PENN","PENN Entertainment"), ("DASH","DoorDash"),
    ]),
    ("Traditional Finance", [
        ("JPM","JPMorgan Chase"), ("BAC","Bank of America"), ("WFC","Wells Fargo"),
        ("GS","Goldman Sachs"), ("MS","Morgan Stanley"), ("C","Citigroup"),
        ("BLK","BlackRock"), ("AXP","American Express"), ("V","Visa"),
        ("MA","Mastercard"), ("COF","Capital One"), ("DFS","Discover Financial"),
        ("SYF","Synchrony Financial"), ("ALLY","Ally Financial"), ("FITB","Fifth Third"),
        ("KEY","KeyCorp"), ("RF","Regions Financial"), ("CFG","Citizens Financial"),
        ("HBAN","Huntington Bancshares"), ("PNC","PNC Financial"),
    ]),
    ("Real Estate & REITs", [
        ("AMT","American Tower"), ("PLD","Prologis"), ("EQIX","Equinix"),
        ("CCI","Crown Castle"), ("SPG","Simon Property"), ("PSA","Public Storage"),
        ("EQR","Equity Residential"), ("AVB","AvalonBay"), ("WELL","Welltower"),
        ("VTR","Ventas"), ("O","Realty Income"), ("STAG","STAG Industrial"),
        ("IIPR","Innovative Industrial"), ("REXR","Rexford Industrial"),
        ("EXR","Extra Space Storage"), ("CUBE","CubeSmart"), ("IRM","Iron Mountain"),
        ("COLD","Americold Realty"), ("LSI","Life Storage"), ("NSA","National Storage"),
    ]),
    ("Travel & Hospitality", [
        ("DAL","Delta Air Lines"), ("UAL","United Airlines"), ("AAL","American Airlines"),
        ("LUV","Southwest Airlines"), ("ALK","Alaska Air"), ("JBLU","JetBlue"),
        ("RYAAY","Ryanair"), ("EXPE","Expedia"), ("BKNG","Booking Holdings"),
        ("ABNB","Airbnb"), ("MAR","Marriott"), ("HLT","Hilton"),
        ("H","Hyatt"), ("IHG","IHG Hotels"), ("WH","Wyndham"),
        ("TNL","Travel + Leisure"), ("VAC","Marriott Vacations"),
        ("NCLH","Norwegian Cruise"), ("CCL","Carnival"), ("RCL","Royal Caribbean"),
    ]),
    ("Quantum Computing", [
        ("IONQ","IonQ"), ("RGTI","Rigetti Computing"), ("QUBT","Quantum Computing"),
        ("ARQIT","Arqit Quantum"), ("QBTS","D-Wave Quantum"),
        ("IBM","IBM"), ("GOOG","Alphabet"), ("HON","Honeywell"),
        ("MSFT","Microsoft"), ("INTC","Intel"), ("AMZN","Amazon"), ("NVDA","NVIDIA"),
    ]),
]

BENCHMARKS = [
    {"name": "S&P 500", "ticker": "^GSPC"},
    {"name": "Nasdaq",  "ticker": "^IXIC"},
    {"name": "Dow",     "ticker": "^DJI"},
]

# ── Supabase HTTP client ──────────────────────────────────────────────────────
class DB:
    def __init__(self, url, key):
        self.base = url.rstrip("/") + "/rest/v1"
        self.h = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        }

    def upsert(self, table, data, on_conflict):
        r = requests.post(f"{self.base}/{table}?on_conflict={on_conflict}", headers=self.h, json=data)
        r.raise_for_status()
        return r.json()

    def delete_where(self, table, col, val):
        requests.delete(f"{self.base}/{table}?{col}=eq.{val}", headers=self.h).raise_for_status()

    def insert(self, table, rows):
        if rows:
            r = requests.post(f"{self.base}/{table}", headers={**self.h, "Prefer": "return=minimal"}, json=rows)
            r.raise_for_status()

# ── Return calculations ───────────────────────────────────────────────────────
def calc_returns(series: pd.Series) -> dict:
    """1W/1M/3M/YTD returns from a Close price series."""
    if series is None or series.empty or len(series) < 2:
        return {}
    series = series.dropna()
    if len(series) < 2:
        return {}
    current = float(series.iloc[-1])

    def pct(days):
        if len(series) <= days:
            return None
        past = float(series.iloc[-(days + 1)])
        return round((current - past) / past * 100, 2) if past else None

    year = datetime.now().year
    ytd_s = series[series.index.year == year]
    ytd = None
    if not ytd_s.empty:
        start = float(ytd_s.iloc[0])
        ytd = round((current - start) / start * 100, 2) if start else None

    return {"week_pct": pct(5), "month_pct": pct(21), "quarter_pct": pct(63), "ytd_pct": ytd}


def safe_avg(values):
    vals = [v for v in values if v is not None]
    return round(sum(vals) / len(vals), 2) if vals else None


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    log.info("══ Eagleview v2 Data Sync ══")

    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        log.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        sys.exit(1)

    db = DB(url, key)

    # ── Collect all unique tickers ────────────────────────────────────────────
    all_tickers = list({t for _, stocks in SECTOR_STOCKS for t, _ in stocks}
                       | {b["ticker"] for b in BENCHMARKS})
    log.info(f"Downloading {len(all_tickers)} tickers in one batch …")

    raw = yf.download(all_tickers, period="1y", progress=False, auto_adjust=True)
    # raw["Close"] is a DataFrame: index=date, columns=tickers
    closes = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw[["Close"]].rename(columns={"Close": all_tickers[0]})

    # Pre-compute returns for every ticker
    ticker_returns = {}
    for ticker in all_tickers:
        if ticker in closes.columns:
            ticker_returns[ticker] = calc_returns(closes[ticker])
        else:
            log.warning(f"  [{ticker}] not in download result")
            ticker_returns[ticker] = {}

    log.info("Download complete. Writing to Supabase …")

    # ── Benchmarks ────────────────────────────────────────────────────────────
    log.info("── Benchmarks ──")
    for bm in BENCHMARKS:
        r = ticker_returns.get(bm["ticker"], {})
        try:
            db.upsert("benchmarks", {
                "name": bm["name"], "ticker": bm["ticker"],
                **r, "updated_at": datetime.utcnow().isoformat(),
            }, "ticker")
            log.info(f"  {bm['name']} YTD={r.get('ytd_pct')}%")
        except Exception as e:
            log.error(f"  {bm['name']} failed: {e}")

    # ── Sectors ───────────────────────────────────────────────────────────────
    log.info("── Sectors ──")
    sector_ok = 0
    for sector_name, stocks in SECTOR_STOCKS:
        try:
            # Upsert sector row (get back the id)
            rows = db.upsert("sectors", {
                "name": sector_name,
                "updated_at": datetime.utcnow().isoformat(),
            }, "name")
            sector_id = rows[0]["id"]

            # Per-stock returns
            stock_rows = []
            for ticker, company in stocks:
                r = ticker_returns.get(ticker, {})
                if not r:
                    log.warning(f"    [{ticker}] no data")
                    continue
                stock_rows.append({
                    "sector_id": sector_id,
                    "ticker": ticker,
                    "company_name": company,
                    **r,
                })

            # Equal-weighted sector averages
            sector_rets = {
                "week_pct":    safe_avg([s.get("week_pct")    for s in stock_rows]),
                "month_pct":   safe_avg([s.get("month_pct")   for s in stock_rows]),
                "quarter_pct": safe_avg([s.get("quarter_pct") for s in stock_rows]),
                "ytd_pct":     safe_avg([s.get("ytd_pct")     for s in stock_rows]),
                "stock_count": len(stock_rows),
            }

            db.upsert("sectors", {
                "name": sector_name, **sector_rets,
                "updated_at": datetime.utcnow().isoformat(),
            }, "name")

            # Refresh individual stock rows
            db.delete_where("sector_holdings", "sector_id", sector_id)
            db.insert("sector_holdings", stock_rows)

            log.info(f"  {sector_name}: {len(stock_rows)} stocks | YTD={sector_rets['ytd_pct']}%")
            sector_ok += 1

        except Exception as e:
            log.error(f"  {sector_name} failed: {e}")

    log.info(f"══ Done: {sector_ok}/{len(SECTOR_STOCKS)} sectors ══")
    if sector_ok < len(SECTOR_STOCKS):
        sys.exit(1)


if __name__ == "__main__":
    main()
