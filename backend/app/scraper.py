"""
Scraper komentar Instagram menggunakan Apify.

Input:
    URL posting/reel Instagram

Output:
    List tuple:
    (teks_komentar, waktu_komentar)

Environment:
    APIFY_API_TOKEN
"""

import os
import datetime as dt
from typing import Optional

from apify_client import ApifyClient


class InstagramError(Exception):
    """Kesalahan saat mengambil komentar Instagram."""


def _client():
    token = os.getenv("APIFY_API_TOKEN")

    if not token:
        raise InstagramError(
            "APIFY_API_TOKEN belum diisi di backend/.env"
        )

    return ApifyClient(token)


def _parse_waktu(value: Optional[str]):
    """
    Mengubah timestamp ISO menjadi datetime.
    """
    if not value:
        return None

    try:
        return dt.datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )
    except Exception:
        return None


def scrape_comments(
    url_atau_media_id: str,
    limit_per_page: int = 100
):
    """
    Mengambil komentar Instagram menggunakan Apify.

    Parameter:
        url_atau_media_id:
            URL posting Instagram.

        limit_per_page:
            Jumlah maksimal komentar yang diambil.

    Return:
        [
            (teks_komentar, waktu_komentar),
            ...
        ]
    """

    url = url_atau_media_id.strip()

    if not url:
        raise InstagramError(
            "URL Instagram belum diisi."
        )

    if "instagram.com" not in url:
        raise InstagramError(
            "Masukkan URL posting/reel Instagram yang valid."
        )

    client = _client()

    run_input = {
        "directUrls": [
            url
        ],
        "resultsLimit": limit_per_page
    }

    try:
        run = client.actor(
            "apify/instagram-comment-scraper"
        ).call(
            run_input=run_input
        )

    except Exception as e:
        raise InstagramError(
            f"Gagal menjalankan Apify: {e}"
        )

    rows = []

    try:
        dataset_items = client.dataset(
            run["defaultDatasetId"]
        ).iterate_items()

        for item in dataset_items:

            teks = (
                item.get("text")
                or item.get("comment")
                or ""
            ).strip()

            waktu_raw = (
                item.get("timestamp")
                or item.get("commentDate")
                or item.get("comment_date")
            )

            waktu = _parse_waktu(waktu_raw)

            if teks:
                rows.append(
                    (teks, waktu)
                )

    except Exception as e:
        raise InstagramError(
            f"Gagal membaca hasil scraper Apify: {e}"
        )

    return rows
