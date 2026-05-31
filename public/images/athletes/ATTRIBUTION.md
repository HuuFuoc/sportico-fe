# Athlete Images Attribution

This directory is intended to hold local badminton athlete images used in the Sportico platform.

## Status

No real athlete photos are included at this time. Reasons:
1. Press/editorial images of athletes are typically copyright protected.
2. Images from Wikipedia/Wikimedia Commons may allow reuse, but require careful license verification per image.
3. Including images that imply endorsement (e.g., "Coach like Kento Momota") without explicit consent is legally risky.

## For production use

To legally include athlete images, we recommend one of the following approaches:

### Option A — Creative Commons / Wikimedia
Search Wikimedia Commons (commons.wikimedia.org) for images of each athlete.
Only use images with licenses such as:
- CC BY (Attribution)
- CC BY-SA (Attribution ShareAlike)
- CC0 (Public Domain)

Avoid images marked "all rights reserved" or from news agencies (Reuters, AP, Getty).

### Option B — Official licensed assets
Obtain images from the Badminton World Federation (bwfbadminton.com) or national federations with explicit commercial usage rights.

### Option C — Original illustrations / avatars
Commission sport-specific athlete avatars from an illustrator, or use AI-generated illustrations (ensure the tool's license allows commercial use).

## Placeholder SVG avatars

Placeholder avatar SVGs are generated programmatically in the app using:
- Initials-based avatar via `src/lib/utils.ts → initials()`
- Background color derived from athlete name hash

## Target athletes (pending legal image acquisition)

| Athlete            | Country     | Notes                              |
|--------------------|-------------|-------------------------------------|
| Kento Momota       | Japan 🇯🇵   | World No.1 (2018–2021)             |
| Loh Kean Yew       | Singapore 🇸🇬 | World Champion 2021                |
| Lin Dan            | China 🇨🇳   | Two-time Olympic gold              |
| Chen Long          | China 🇨🇳   | Olympic Champion 2016              |
| Shi Yu Qi          | China 🇨🇳   | World Champion 2018                |
| Taufik Hidayat     | Indonesia 🇮🇩 | Olympic Champion 2004             |
| Anthony Ginting    | Indonesia 🇮🇩 | Asian Games Champion 2018         |
| Jonatan Christie   | Indonesia 🇮🇩 | Olympic Bronze 2020               |
| Akane Yamaguchi    | Japan 🇯🇵   | World No.1 Women's Singles         |
| Nozomi Okuhara     | Japan 🇯🇵   | World Champion 2017                |

## Usage notes

- Do NOT claim athlete endorsement of Sportico.
- Use wording like "Inspired by elite badminton training" instead of implying any official affiliation.
- When images are added, record the filename, source URL, license type, and attribution required.
