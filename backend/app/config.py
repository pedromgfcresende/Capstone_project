from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://xange:xange@localhost:5544/xange"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    crm_data_dir: str = "../../Capstone-Project_ESADE_x_XAnge/data"

    # ── LLM (Week 2) ──
    llm_provider: str = "anthropic"  # anthropic | openai
    llm_model: str = ""  # optional override; falls back to a provider default
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # ── Web research (M2) ──
    tavily_api_key: str = ""

    # ── Open-data collection (M4) — all keyless except UK Companies House ──
    # UK Companies House needs a free API key; the FR registry, World Bank and
    # SEC EDGAR collectors work without any key.
    companies_house_api_key: str = ""
    collect_user_agent: str = "XAnge-Market-Intel/1.0 (research; contact@xange.vc)"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_model(self) -> str:
        if self.llm_model:
            return self.llm_model
        return "claude-sonnet-4-5" if self.llm_provider == "anthropic" else "gpt-4o-mini"

    @property
    def has_llm_key(self) -> bool:
        if self.llm_provider == "anthropic":
            return bool(self.anthropic_api_key)
        if self.llm_provider == "openai":
            return bool(self.openai_api_key)
        return False


settings = Settings()
