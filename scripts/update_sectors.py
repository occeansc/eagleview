#!/usr/bin/env python3
"""
Eagleview v3b — Data Updater
==============================
Fixes:
  - Sector aggregate returns now use explicit PATCH (not upsert) so
    week_pct / month_pct / quarter_pct / ytd_pct are reliably written
  - Added verify step: logs what was actually saved to DB
  - Better per-step error logging

Curation changes vs v3:
  - Semiconductors: +AMKR, +WDC  (removed MCHP, ON — lower AI relevance)
  - AI & Machine Learning: +TEM (Tempus AI) — removed ABSI
  - Robotics & Automation: +SERV (Serve Robotics) — removed NNDM
  - Biotech & Genomics: +TXG (10x Genomics), +PACB — removed RCUS, DNLI
  - EV, Battery & Autonomy: -CHPT, -BLNK (charging oversaturated); +SLDP, +PCRFY
  - Digital Assets: trimmed to 16 (removed ARBK, MIGI, PYPL, SQ — keep crypto-pure)

Env vars:
  SUPABASE_URL          project URL — NO trailing /rest/v1
  SUPABASE_SERVICE_KEY  legacy eyJ... service_role key
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

# ─────────────────────────────────────────────────────────────────────────────
SECTOR_STOCKS = [
    ("Semiconductors", [
        ("NVDA","NVIDIA"), ("AMD","Advanced Micro Devices"), ("AVGO","Broadcom"),
        ("TSM","Taiwan Semiconductor"), ("QCOM","Qualcomm"), ("INTC","Intel"),
        ("MU","Micron Technology"), ("AMAT","Applied Materials"), ("LRCX","Lam Research"),
        ("KLAC","KLA Corp"), ("ASML","ASML Holding"), ("TXN","Texas Instruments"),
        ("ADI","Analog Devices"), ("MCHP","Microchip Technology"), ("ON","ON Semiconductor"),
        ("NXPI","NXP Semiconductors"), ("MRVL","Marvell Technology"), ("MPWR","Monolithic Power"),
        ("ARM","ARM Holdings"), ("STX","Seagate Technology"),
        ("WDC","Western Digital"), ("AMKR","Amkor Technology"),
    ]),
    ("Software & Cloud", [
        ("MSFT","Microsoft"), ("CRM","Salesforce"), ("NOW","ServiceNow"),
        ("SNOW","Snowflake"), ("DDOG","Datadog"), ("MDB","MongoDB"),
        ("HUBS","HubSpot"), ("WDAY","Workday"), ("VEEV","Veeva Systems"),
        ("TEAM","Atlassian"), ("GTLB","GitLab"), ("PATH","UiPath"),
        ("CFLT","Confluent"), ("BILL","Bill.com"), ("DOCN","DigitalOcean"),
        ("ZI","ZoomInfo"), ("PCTY","Paylocity"), ("ESTC","Elastic"),
        ("ORCL","Oracle"), ("ADBE","Adobe"),
    ]),
    ("Cybersecurity", [
        ("CRWD","CrowdStrike"), ("PANW","Palo Alto Networks"), ("ZS","Zscaler"),
        ("FTNT","Fortinet"), ("S","SentinelOne"), ("OKTA","Okta"),
        ("CYBR","CyberArk Software"), ("TENB","Tenable"), ("RPD","Rapid7"),
        ("QLYS","Qualys"), ("NET","Cloudflare"), ("CHKP","Check Point"),
        ("BAH","Booz Allen Hamilton"), ("CACI","CACI International"), ("LDOS","Leidos"),
        ("SAIC","SAIC"), ("CSCO","Cisco Systems"), ("DXC","DXC Technology"),
        ("EPAM","EPAM Systems"), ("AKAM","Akamai Technologies"),
    ]),
    ("AI & Machine Learning", [
        ("PLTR","Palantir"), ("AI","C3.ai"), ("BBAI","BigBear.ai"),
        ("SOUN","SoundHound AI"), ("GOOG","Alphabet"), ("META","Meta Platforms"),
        ("IBM","IBM"), ("AMBA","Ambarella"), ("PEGA","Pegasystems"),
        ("NICE","NICE Systems"), ("VRNT","Verint Systems"), ("SDGR","Schrodinger"),
        ("RXRX","Recursion Pharma"), ("TEM","Tempus AI"), ("APP","AppLovin"),
        ("AEVA","Aeva Technologies"), ("ORCL","Oracle"),
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
        ("HIVE","HIVE Digital"),
    ]),
    ("Biotech & Genomics", [
        ("CRSP","CRISPR Therapeutics"), ("EDIT","Editas Medicine"), ("BEAM","Beam Therapeutics"),
        ("NTLA","Intellia Therapeutics"), ("VERV","Verve Therapeutics"),
        ("IONS","Ionis Pharmaceuticals"), ("ALNY","Alnylam Pharmaceuticals"), ("REGN","Regeneron"),
        ("MRNA","Moderna"), ("BNTX","BioNTech"), ("VRTX","Vertex Pharmaceuticals"),
        ("HALO","Halozyme Therapeutics"), ("ARWR","Arrowhead Pharma"),
        ("INSM","Insmed"), ("RXRX","Recursion Pharma"), ("BMRN","BioMarin Pharma"),
        ("ILMN","Illumina"), ("NTRA","Natera"),
        ("TXG","10x Genomics"), ("PACB","Pacific Biosciences"),
    ]),
    ("Pharma & MedTech", [
        ("JNJ","Johnson & Johnson"), ("PFE","Pfizer"), ("LLY","Eli Lilly"),
        ("ABBV","AbbVie"), ("BMY","Bristol Myers Squibb"), ("MRK","Merck"),
        ("NVO","Novo Nordisk"), ("AZN","AstraZeneca"), ("ISRG","Intuitive Surgical"),
        ("MDT","Medtronic"), ("EW","Edwards Lifesciences"), ("SYK","Stryker"),
        ("BSX","Boston Scientific"), ("DXCM","Dexcom"), ("PODD","Insulet"),
        ("HOLX","Hologic"), ("ZBH","Zimmer Biomet"), ("INMD","InMode"),
        ("AMGN","Amgen"), ("GILD","Gilead Sciences"),
    ]),
    ("EV, Battery & Autonomy", [
        ("TSLA","Tesla"), ("RIVN","Rivian"), ("LCID","Lucid Motors"),
        ("NIO","NIO"), ("LI","Li Auto"), ("XPEV","XPeng"),
        ("QS","QuantumScape"), ("EVGO","EVgo"),
        ("ALB","Albemarle"), ("SQM","SQM"),
        ("LAC","Lithium Americas"), ("PLL","Piedmont Lithium"), ("LTHM","Livent"),
        ("MP","MP Materials"), ("LEA","Lear Corp"), ("MGA","Magna International"),
        ("MBLY","Mobileye"), ("BYDDF","BYD Company"),
        ("SLDP","Solid Power"), ("PCRFY","Panasonic Holdings"),
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
        ("IR","Ingersoll Rand"), ("FANUY","Fanuc"),
        ("SYM","Symbotic"), ("TSLA","Tesla"), ("SERV","Serve Robotics"),
        ("ACMR","ACM Research"), ("FORM","FormFactor"), ("COHU","Cohu"),
        ("ONTO","Onto Innovation"), ("ENTG","Entegris"), ("AEIS","Advanced Energy Industries"),
    ]),
    ("Photonics & Optical", [
        ("COHR","Coherent Corp"), ("LITE","Lumentum"), ("VIAVI","Viavi Solutions"),
        ("LPTH","LightPath Technologies"), ("AAOI","Applied Optoelectronics"),
        ("LAZR","Luminar Technologies"), ("INVZ","Innoviz Technologies"),
        ("OUST","Ouster"), ("AEVA","Aeva Technologies"), ("MVIS","MicroVision"),
        ("IPGP","IPG Photonics"), ("MTSI","MACOM Technology"), ("MKSI","MKS Instruments"),
        ("CRUS","Cirrus Logic"), ("HLIT","Harmonic"),
        ("OSIS","OSI Systems"), ("HIMX","Himax Technologies"),
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
    ("Power & Data Center Infrastructure", [
        ("VRT","Vertiv Holdings"), ("ETN","Eaton Corp"), ("HUBB","Hubbell"),
        ("GEV","GE Vernova"), ("PWR","Quanta Services"), ("FIX","Comfort Systems"),
        ("EQIX","Equinix"), ("DLR","Digital Realty"),
        ("SMCI","Super Micro Computer"), ("CLS","Celestica"),
        ("DELL","Dell Technologies"), ("HPE","Hewlett Packard Enterprise"),
        ("TT","Trane Technologies"), ("CARR","Carrier Global"),
        ("POWL","Powell Industries"), ("VST","Vistra"),
        ("CEG","Constellation Energy"), ("ANET","Arista Networks"),
        ("POWI","Power Integrations"), ("MYR","MYR Group"),
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
        ("COLD","Americold Realty"), ("DLR","Digital Realty"), ("SBAC","SBA Communications"),
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
        ("IONQ","IonQ"), ("RGTI","Rigetti Computing"), ("QUBT","Quantum Computing Inc"),
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


# ── Supabase client ───────────────────────────────────────────────────────────
class DB:
    def __init__(self, url, key):
        self.base = url.rstrip("/") + "/rest/v1"
        self.rh = {          # return=representation
            "apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        }
        self.mh = {          # return=minimal (inserts, deletes)
            "apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

    def upsert(self, table, data, on_conflict):
        r = requests.post(
            f"{self.base}/{table}?on_conflict={on_conflict}",
            headers=self.rh, json=data, timeout=30,
        )
        r.raise_for_status()
        result = r.json()
        if not result:
            raise ValueError(f"Upsert to {table} returned empty — on_conflict={on_conflict}")
        return result

    def patch(self, table, filters: dict, data: dict):
        """Update rows matching filters."""
        qs = "&".join(f"{k}=eq.{v}" for k, v in filters.items())
        r = requests.patch(
            f"{self.base}/{table}?{qs}",
            headers=self.rh, json=data, timeout=30,
        )
        r.raise_for_status()
        return r.json()

    def delete_where(self, table, col, val):
        r = requests.delete(
            f"{self.base}/{table}?{col}=eq.{val}",
            headers=self.mh, timeout=30,
        )
        r.raise_for_status()

    def insert(self, table, rows):
        if not rows:
            return
        r = requests.post(
            f"{self.base}/{table}",
            headers=self.mh, json=rows, timeout=30,
        )
        r.raise_for_status()


# ── Return calculations ───────────────────────────────────────────────────────
def calc_returns(series: pd.Series) -> dict:
    if series is None or series.empty:
        return {}
    series = series.dropna()
    if len(series) < 2:
        return {}
    current = float(series.iloc[-1])

    def pct(days: int):
        if len(series) <= days:
            return None
        past = float(series.iloc[-(days + 1)])
        if not past:
            return None
        return round((current - past) / past * 100, 2)

    year = datetime.now().year
    ytd_s = series[series.index.year == year]
    ytd = None
    if not ytd_s.empty:
        start = float(ytd_s.iloc[0])
        if start:
            ytd = round((current - start) / start * 100, 2)

    result = {
        "week_pct":    pct(5),
        "month_pct":   pct(21),
        "quarter_pct": pct(63),
        "ytd_pct":     ytd,
    }
    # Only return dict if at least one period has data
    if any(v is not None for v in result.values()):
        return result
    return {}


def safe_avg(values):
    vals = [v for v in values if v is not None]
    return round(sum(vals) / len(vals), 2) if vals else None


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    log.info("══ Eagleview v3b Data Sync ══")

    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        log.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        sys.exit(1)

    # Quick connectivity check
    try:
        r = requests.get(f"{url}/rest/v1/sectors?limit=1",
                         headers={"apikey": key, "Authorization": f"Bearer {key}"}, timeout=10)
        r.raise_for_status()
        log.info(f"DB connection OK — {r.status_code}")
    except Exception as e:
        log.error(f"DB connection FAILED: {e}")
        sys.exit(1)

    db = DB(url, key)

    # ── Batch download ────────────────────────────────────────────────────────
    all_tickers = list(
        {t for _, stocks in SECTOR_STOCKS for t, _ in stocks}
        | {b["ticker"] for b in BENCHMARKS}
    )
    log.info(f"Downloading {len(all_tickers)} tickers in one batch …")

    try:
        raw = yf.download(all_tickers, period="1y", progress=False, auto_adjust=True)
        if isinstance(raw.columns, pd.MultiIndex):
            closes = raw["Close"]
        else:
            # Single ticker fallback (shouldn't happen with multiple tickers)
            closes = raw[["Close"]].rename(columns={"Close": all_tickers[0]})
        log.info(f"Download returned {closes.shape[0]} rows × {closes.shape[1]} tickers")
    except Exception as e:
        log.error(f"Batch download failed: {e}")
        sys.exit(1)

    ticker_returns: dict[str, dict] = {}
    for ticker in all_tickers:
        if ticker in closes.columns:
            ticker_returns[ticker] = calc_returns(closes[ticker])
        else:
            ticker_returns[ticker] = {}

    with_data    = sum(1 for r in ticker_returns.values() if r)
    without_data = len(all_tickers) - with_data
    log.info(f"Returns calculated: {with_data} tickers have data, {without_data} missing")
    if without_data:
        missing = [t for t, r in ticker_returns.items() if not r]
        log.warning(f"Missing tickers: {missing}")

    # ── Benchmarks ────────────────────────────────────────────────────────────
    log.info("── Benchmarks ──")
    for bm in BENCHMARKS:
        r = ticker_returns.get(bm["ticker"], {})
        try:
            db.upsert("benchmarks", {
                "name": bm["name"], "ticker": bm["ticker"],
                **r, "updated_at": datetime.utcnow().isoformat(),
            }, "ticker")
            log.info(f"  ✓ {bm['name']}  1W={r.get('week_pct')}%  YTD={r.get('ytd_pct')}%")
        except Exception as e:
            log.error(f"  ✗ {bm['name']}: {e}")

    # ── Sectors ───────────────────────────────────────────────────────────────
    log.info("── Sectors ──")
    sector_ok, sector_fail = 0, []

    for sector_name, stocks in SECTOR_STOCKS:
        try:
            # Step 1: ensure sector row exists, get id
            rows = db.upsert("sectors", {
                "name":       sector_name,
                "updated_at": datetime.utcnow().isoformat(),
            }, "name")
            sector_id = rows[0]["id"]

            # Step 2: build per-stock rows (only stocks with valid return data)
            stock_rows = []
            for ticker, company in stocks:
                ret = ticker_returns.get(ticker, {})
                if ret:  # skip tickers with no data
                    stock_rows.append({
                        "sector_id":    sector_id,
                        "ticker":       ticker,
                        "company_name": company,
                        **ret,
                    })

            # Step 3: compute equal-weighted sector averages
            sector_rets = {
                "week_pct":    safe_avg([s.get("week_pct")    for s in stock_rows]),
                "month_pct":   safe_avg([s.get("month_pct")   for s in stock_rows]),
                "quarter_pct": safe_avg([s.get("quarter_pct") for s in stock_rows]),
                "ytd_pct":     safe_avg([s.get("ytd_pct")     for s in stock_rows]),
                "stock_count": len(stock_rows),
            }

            log.info(
                f"  {sector_name}: {len(stock_rows)}/{len(stocks)} stocks | "
                f"1W={sector_rets['week_pct']}%  "
                f"1M={sector_rets['month_pct']}%  "
                f"YTD={sector_rets['ytd_pct']}%"
            )

            # Step 4: PATCH sector row with computed returns (explicit update, not upsert)
            # This avoids any conflict with the initial upsert and is guaranteed to write
            patch_result = db.patch("sectors", {"id": sector_id}, {
                **sector_rets,
                "updated_at": datetime.utcnow().isoformat(),
            })
            if patch_result and patch_result[0].get("ytd_pct") is not None:
                log.info(f"    DB verified: ytd_pct={patch_result[0]['ytd_pct']}%  ✓")
            else:
                log.warning(f"    DB verify: ytd_pct still NULL after patch — check schema")

            # Step 5: refresh individual stock returns
            db.delete_where("sector_holdings", "sector_id", sector_id)
            if stock_rows:
                db.insert("sector_holdings", stock_rows)

            sector_ok += 1

        except Exception as e:
            log.error(f"  ✗ {sector_name}: {e}")
            sector_fail.append(sector_name)

    log.info(f"══ Done: {sector_ok}/{len(SECTOR_STOCKS)} sectors OK ══")
    if sector_fail:
        log.warning(f"Failed sectors: {sector_fail}")
        sys.exit(1)


if __name__ == "__main__":
    main()
