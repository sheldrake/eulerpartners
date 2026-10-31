import json
import os
import re

print("--- Starting Migration Script ---")

try:
    with open('media.json', 'r') as f:
        media_data = json.load(f)
    print(f"✅ Loaded media.json with {len(media_data)} items.")
except Exception as e:
    print(f"❌ Error loading media.json: {e}")
    exit()

id_to_file = {item['id']: item['source_url'].split('/')[-1] for item in media_data}

content_dir = 'content/concepts'
if not os.path.exists(content_dir):
    content_dir = 'concepts'

print(f"🔍 Scanning directory: {content_dir}")

files_processed = 0
images_replaced = 0
first_match_printed = False

for root, dirs, files in os.walk(content_dir):
    for file in files:
        if file.endswith('.md'):
            files_processed += 1
            filepath = os.path.join(root, file)

            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            original_content = content

            # Regex looks for: \[crocal...image="652"...\]
            # It ignores escaped underscores and extra attributes
            pattern = r'\\?\[crocal.*?image=["“”\']?(\d+)["“”\']?.*?\\?\]'

            def replace_image(match):
                global images_replaced, first_match_printed
                image_id = int(match.group(1))
                if image_id in id_to_file:
                    filename = id_to_file[image_id]
                    images_replaced += 1

                    if not first_match_printed:
                        print(f"\n🎯 First match found in: {file}")
                        print(f"   Original: {repr(match.group(0))}")
                        print(f"   Replaced with: ![Image](/images/{filename})\n")
                        first_match_printed = True

                    return f'\n\n![Image](/images/{filename})\n\n'
                return match.group(0)

            updated_content = re.sub(pattern, replace_image, content)

            # Strip layout shortcodes (handling escaped brackets and underscores)
            # Replaces them with a space so text doesn't jam together
            updated_content = re.sub(r'\\?\[/?vc.*?\\?\]', ' ', updated_content)
            updated_content = re.sub(r'\\?\[/?crocal.*?\\?\]', ' ', updated_content)

            # Clean up excessive spaces and blank lines
            updated_content = re.sub(r'[ \t]+', ' ', updated_content)
            updated_content = re.sub(r'\n{3,}', '\n\n', updated_content)

            if updated_content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(updated_content)

print("--- Finished ---")
print(f"📄 Markdown files processed: {files_processed}")
print(f"🖼️ Images successfully replaced: {images_replaced}")
