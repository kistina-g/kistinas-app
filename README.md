# NYC Everyday — GitHub wardrobe setup

Your wardrobe is shared through the files in this project:
- `wardrobe.json` stores clothing details.
- `wardrobe/` stores the clothing photos.
- The app reads these files from GitHub Pages.
- To add, edit, or remove clothing, change the files in GitHub and commit. Refresh the app to see the update.

## Add a clothing photo

1. Open the `wardrobe/` folder in your GitHub repository. Create it if needed.
2. Choose **Add file → Upload files**, upload the photo, and commit.
3. Edit `wardrobe.json` and add an object using the exact photo path.

Example:

```json
[
  {
    "id": "black-puffer",
    "name": "Black puffer jacket",
    "category": "outerwear",
    "warmth": 4,
    "color": "Black",
    "notes": "Very warm",
    "image": "wardrobe/black-puffer.jpg"
  },
  {
    "id": "blue-jeans",
    "name": "Blue jeans",
    "category": "bottom",
    "warmth": 2,
    "color": "Blue",
    "notes": "",
    "image": "wardrobe/blue-jeans.jpg"
  }
]
```

## Fields

- `id`: unique text identifier
- `name`: clothing name
- `category`: `top`, `bottom`, `outerwear`, `shoes`, `dress`, or `accessory`
- `warmth`: `1` Light, `2` Medium, `3` Warm, or `4` Very warm
- `color`, `notes`: optional text
- `image`: path to the image inside `wardrobe/`

Keep `index.html`, `wardrobe.json`, and the `wardrobe/` folder together at the same published project level (for example, all inside `/docs` if Pages publishes from `/docs`).
