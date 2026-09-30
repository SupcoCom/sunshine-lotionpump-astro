# Content audit — conflicts found on the legacy site

The rebuild publishes **one** canonical value for each field below. Every alternative value that
exists on the live site is listed here with where it appeared, so the owner can confirm the
single truth. **Nothing was invented** — each value is copied from the legacy site.

## 1. Legal entity name

| | Value | Where |
|---|---|---|
| **Published** | `Ningbo Sunshine Plastic Industry Co., Ltd.` | home body, about body, footer, contact footer, all LPs |
| Also on site | `Ningbo Shaoshuai Plastic Industry Co., Ltd.` | about-us body, contact-us body, `/lotion-pump-manufacturer/` byline + footer block |

## 2. City

| | Value | Where |
|---|---|---|
| **Published** | `Cixi, Ningbo, Zhejiang` | home body, about body, footer, LPs |
| Also on site | `Yuyao, Zhejiang` | about-us body, contact-us body, `/lotion-pump-manufacturer/` |

## 3. Founding year

| | Value | Where |
|---|---|---|
| **Published** | `2018` | home hero "COMPANY SINCE 2018", home counter, footer, contact, LPs |
| Also on site | `2005` | about-us counter |
| Also on site | `2010` | about-us counter, `/lotion-pump-manufacturer/` "Founded 2010" |
| Also on site | `2015` | home counter `data-from-value` |

## 4. Years in business

| | Value | Where |
|---|---|---|
| **Published** | `since 2018` | consistent with the above |
| Also on site | `7+ years` | home "Manufacturing Excellence" |
| Also on site | `14+ years` | about-us "Over 14+ years", `/lotion-pump-manufacturer/` |

## 5. Contact page address

The contact page body said *"Ningbo Shaoshuai Plastic Industry Co., Ltd. Yuyao, Zhejiang Province
China 315400"*. The footer on the same page says *"1109 Huancheng South Road, Zhouxiang Town,
Cixi City, Ningbo City, Zhejiang Province"*. The rebuild uses the footer value everywhere.

## 6. MOQ

| | Value | Where |
|---|---|---|
| **Published** | `10,000 pcs` (products), `5,000 pcs` (contact page / about page) | both appear on the live site |

Both are published as-is because they appear on different page types. Worth confirming which is
the real entry MOQ.

## 7. Other content issues found (fixed in the rebuild)

| Issue | Fix |
|---|---|
| `/products/` H1 was a random product title | Real H1 + proper meta description |
| `/privacy-policy/` meta description was `Last updated: August 19, 2026` | Real description |
| Home page counters rendered as `0` / `11+` / `0 ㎡` without JS | Static values: 2018 / 50+ / 7,000 m² |
| Blog post category names were plain text, no links | Linked to `/category/blog/<slug>/` |
| `lotion-pump-manufacturer-landingpage` (v1) was live but `noindex` | 301 to v2 + kept as `noindex` safety net |
| `elementor-1657` draft was still reachable | 301 to `/` |
| Product titles carried a redundant `| SUNSHINE` suffix in `<h1>` | Suffix stripped in headings, kept in `<title>` for SERP parity |

## 8. Marketing claims kept as published

These are the client's own claims and are reproduced unchanged: 90,000+ orders, 97.62% inquiry
response rate, 50M+ units/year, 7,000 m² factory, 10 injection moulding machines, 4 automated
assembly lines, 6 export markets, ISO 9001:2015, SGS-tested.
