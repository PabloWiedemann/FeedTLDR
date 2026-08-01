import pandas as pd


def preprocess_X_data(data_path):
    # Load csv
    df = pd.read_csv(data_path)

    # Write DataFrame rows to a text file
    column_names = df.columns.tolist()
    data_as_str = "SCRAPED POSTS FROM X (formerly Twitter):\n\n POST -> "
    for index, row in df.iterrows():
        row_data = list(map(str, row.tolist()))
        row_data_with_cols = [
            f"{col}: {str(row_data[i]) if row_data[i] is not  None else 'None'}"
            for i, col in enumerate(column_names)
        ]
        data_as_str += "; ".join(row_data_with_cols) + " || POST -> "

    return data_as_str
