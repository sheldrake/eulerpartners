import os
import re

content_dir = 'content/concepts'
if not os.path.exists(content_dir):
    content_dir = 'concepts'

print(f"Scanning {content_dir}...")
count = 0

for root, dirs, files in os.walk(content_dir):
    for file in files:
        if file.endswith('.md'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Match the first YAML block at the very start of the file
            # re.DOTALL allows the .*? to match across multiple lines
            match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)

            if match:
                fm = match.group(1)
                body = content[match.end():].lstrip() # Strip leading newlines from body

                # Extract the useful keys
                title = re.search(r'^title:\s*(.*)$', fm, re.MULTILINE)
                date = re.search(r'^date:\s*(.*)$', fm, re.MULTILINE)
                url = re.search(r'^url:\s*(.*)$', fm, re.MULTILINE)

                # Rebuild clean front matter
                new_fm = "---\n"
                if title: new_fm += f"title: {title.group(1)}\n"
                if date: new_fm += f"date: {date.group(1)}\n"
                if url: new_fm += f"url: {url.group(1)}\n"
                new_fm += "---\n\n"

                new_content = new_fm + body

                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)

                count += 1
                print(f"✅ Cleaned: {file}")

print(f"\nDone! Cleaned {count} files.")
