import pandas as pd
from typing import Iterable, Mapping


def export_to_csv(data: Iterable[Mapping], file_path: str) -> str:
    df = pd.DataFrame.from_records(data)
    df.to_csv(file_path, index=False)
    return file_path
