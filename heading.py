import os

content_dir = 'content/concepts'
if not os.path.exists(content_dir):
    content_dir = 'concepts'

print("Adding LINKS subheadings...")
count = 0

for root, dirs, files in os.walk(content_dir):
    for file in files:
        if file.endswith('.md'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            # Skip if we somehow already added it
            if any("LINKS" in line for line in lines):
                continue

            # Find the first bullet point in the file
            for i, line in enumerate(lines):
                if line.strip().startswith('- ') or line.strip().startswith('* '):
                    # Insert the heading with proper spacing before the list
                    lines.insert(i, "## 🔗 LINKS\n\n")
                    break

            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            count += 1

print(f"Done! Updated {count} files.")
