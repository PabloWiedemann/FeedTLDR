import os
import sys
import pytest
from dotenv import load_dotenv

# Get the absolute path of the project root (one level up from tests/)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)


@pytest.fixture(scope="session", autouse=True)
def load_env():
    """Load environment variables from .env file for all tests"""
    load_dotenv()


def pytest_collection_modifyitems(config, items):
    """Live-integration suites (real Apify scrapes that cost money, real
    email sends) run ONLY when explicitly opted in with RUN_LIVE_TESTS=1
    AND their API keys are present. Everything else always runs."""
    load_dotenv()
    live_enabled = os.environ.get("RUN_LIVE_TESTS") == "1"
    key_requirements = {
        "test_twitter_scraper": ["APIFY_API_KEY"],
        "test_utils_sendgrid": ["RESEND_API_KEY"],
    }
    for item in items:
        for module_part, keys in key_requirements.items():
            if module_part in item.nodeid:
                missing = [k for k in keys if not os.environ.get(k)]
                if not live_enabled:
                    item.add_marker(
                        pytest.mark.skip(
                            reason="Live integration test: set RUN_LIVE_TESTS=1 to run"
                        )
                    )
                elif missing:
                    item.add_marker(
                        pytest.mark.skip(
                            reason=f"Missing required API keys: {', '.join(missing)}"
                        )
                    )


@pytest.fixture
def require_api_keys():
    """Skip tests if required API keys are missing"""
    required_keys = [
        "OPENAI_API_KEY",
        "GEMINI_API_KEY",
    ]

    missing_keys = [key for key in required_keys if not os.environ.get(key)]

    if missing_keys:
        pytest.skip(f"Missing required API keys: {', '.join(missing_keys)}")


@pytest.fixture
def simon_accounts():
    return [
        "@AIFraunhoferHHI",
        "@tkipf",
        "@demishassabis",
        "@LiquidAI_",
        "@TinyMLClub",
        "@geoffreyhinton",
        "@tunguz",
        "@mmbronstein",
        "@Wiedemann_Simon",
        "@cognilytica",
        "@miniapeur",
        "@MLStreetTalk",
        "@Kling_ai",
        "@michael_nielsen",
        "@3blue1brown",
        "@cryengine",
        "@CAIDA_UBC",
        "@yacineMTB",
        "@geoff_hinton",
        "@iamtrask",
        "@ShaneLegg",
        "@bestofnextdoor",
        "@smartereveryday",
        "@WojciechSamek",
        "@satyanadella",
        "@ddiakopoulos",
        "@imisra_",
        "@baaadas",
        "@ilyasut",
        "@FraunhoferHHI",
        "@svpino",
        "@TacoCohen",
        "@FoxNews",
        "@WSJ",
        "@KyleSargentAI",
        "@martin_casado",
        "@NeurIPSConf",
        "@aralroca",
        "@karpathy",
        "@paulg",
        "@javilopen",
        "@torchcompiled",
        "@StartupArchive_",
        "@CERN",
        "@huggingface",
        "@nmwsharp",
        "@EdgeImpulse",
        "@GoogleDeepMind",
        "@reidhoffman",
        "@MinghuaLiu_",
        "@KamalaHarris",
        "@dpkingma",
        "@mlopscommunity",
        "@SambaNovaAI",
        "@onnxai",
        "@statuspro",
        "@hillbig",
        "@canadabusiness",
        "@songhan_mit",
        "@OriolVinyalsML",
        "@simonw",
        "@PreferredNetJP",
        "@TechCrunch",
        "@neuralmagic",
        "@MichelleObama",
        "@sosk_sosk",
        "@HF0Residency",
        "@goodfellow_ian",
        "@Auto_GPT",
        "@unitygames",
        "@_mario_neo_",
        "@CVPR",
        "@SchmidhuberAI",
        "@UnitreeRobotics",
        "@ilkedemir",
        "@StanfordAILab",
        "@SarahAWillson",
        "@ai_guild",
        "@marktenenholtz",
        "@UnrealEngine",
        "@OpenAI",
        "@DanCalds",
        "@hardmaru",
        "@TheTuringPost",
        "@Andercot",
        "@Tocelot",
        "@mtravizano",
        "@answerdotai",
        "@YiTayML",
        "@gdb",
        "@webcouv3r",
        "@ykilcher",
        "@ApacheTVM",
        "@DegenForce_xyz",
        "@bayesgroup",
        "@raegnar",
        "@wightmanr",
        "@DeepMind_Health",
        "@kodjima33",
        "@soumithchintala",
        "@ZeyuanAllenZhu",
        "@RiversHaveWings",
        "@stephensonhmatt",
        "@AIatMeta",
        "@JoeBiden",
        "@NandoDF",
        "@wellingmax",
        "@badfellow_ian",
        "@DotCSV",
        "@EugeneDyabin",
        "@ylecun",
        "@hysts12321",
        "@ProfFeynman",
        "@CovariantAI",
        "@VP",
        "@arxivblog",
        "@OneSherryZ",
        "@paperswithcode",
        "@geoffreyirving",
        "@levelsio",
        "@cdntechjournal",
        "@ycombinator",
        "@RanaHanocka",
        "@veritasium",
        "@drfeifei",
        "@taiyasaki",
        "@ndeainc",
        "@GoogleAI",
        "@janusch_patas",
        "@Crytek",
        "@FireworksAI_HQ",
        "@device_ai",
        "@BillGates",
        "@techberlin",
        "@MrBeast",
        "@vhmth",
        "@Dalle2Pics",
        "@chipro",
        "@emmanuel_2m",
        "@DecartAI",
        "@hellomayuko",
        "@WayneINR",
        "@vincesitzmann",
        "@garrytan",
        "@AOC",
        "@eems_mit",
        "@BrantonDeMoss",
        "@karen_ullrich",
        "@Cixelyn",
        "@ClementDelangue",
        "@JeffDean",
        "@engineers_feed",
        "@icmlconf",
        "@NathanLands",
        "@dburgar",
        "@BillNye",
        "@BrucePon",
        "@fitchain_io",
        "@sama",
        "@jb_cordonnier",
        "@BBCWorld",
        "@hugo_larochelle",
        "@FlorentGuinier",
        "@PyTorch",
        "@StabilityAI",
        "@_akhaliq",
        "@DrYangSong",
        "@playbook3d",
        "@PowerPixelKK",
        "@deepbayes",
        "@iamjohnoliver",
        "@tweetsauce",
        "@getgrover",
        "@LiorOnAI",
        "@iclr_conf",
        "@sharifshameem",
        "@Suhail",
        "@washingtonpost",
        "@ArashVahdat",
        "@EurekaLabsAI",
        "@MIT",
        "@BBCBreaking",
        "@wsbmod",
        "@pabbeel",
        "@dennybritz",
        "@NASA",
        "@BradyHaran",
        "@theworldlabs",
        "@yeewhye",
        "@berkeley_ai",
        "@GittaKutyniok",
        "@rsalakhu",
        "@Koven_Yu",
        "@venturetwins",
        "@minutephysics",
        "@FrontierBC",
        "@RealAAAI",
        "@sequoia",
        "@AstraliteHeart",
        "@maximelabonne",
        "@rowancheung",
        "@durdensol",
        "@Startup_Canada",
        "@fchollet",
        "@OntInnovation",
        "@lexfridman",
        "@petewarden",
        "@fhuszar",
        "@GenAICollective",
        "@jcjohnss",
        "@neuralink",
        "@MKBHD",
        "@kristychoi_",
        "@AndrewYNg",
        "@alexisohanian",
        "@Oxford_VGG",
        "@twimlai",
        "@alexandr_wang",
        "@_ToriML_",
        "@BenMildenhall",
        "@trentmc0",
        "@BigchainDB",
        "@ComfyUI",
        "@oceanprotocol",
        "@GalaxyKate",
        "@VsauceTwo",
        "@neiltyson",
        "@CatchTheLatest",
        "@Google",
        "@samcharrington",
    ]


@pytest.fixture
def test_accounts():
    return [
        "@elonmusk",
        "@paulg",
        "@levelsio",
    ]
