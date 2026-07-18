import pandas as pd
from typing import Iterable, Mapping


def export_to_excel(data: Iterable[Mapping], file_path: str) -> str:
    df = pd.DataFrame.from_records(data)
    df.to_excel(file_path, index=False, engine="openpyxl")
    return file_path
