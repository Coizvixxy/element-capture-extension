from PIL import Image, ImageDraw
import os

def create_icon(size, filename):
    # Create image with gradient
    img = Image.new('RGBA', (size, size), (102, 126, 234, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle background
    corner_radius = size // 5
    draw.rounded_rectangle(
        [(0, 0), (size-1, size-1)],
        radius=corner_radius,
        fill=(102, 126, 234, 255),
        outline=(118, 75, 162, 255),
        width=2
    )
    
    # Draw document rectangle
    doc_x = size // 7
    doc_y = size // 6
    doc_w = size // 2
    doc_h = size // 3
    stroke_width = max(2, size // 40)
    
    # Document background (semi-transparent white)
    draw.rectangle(
        [doc_x, doc_y, doc_x + doc_w, doc_y + doc_h],
        fill=(255, 255, 255, 30),
        outline=(255, 255, 255, 255),
        width=stroke_width
    )
    
    # Draw lines representing text
    line_height = size // 32
    line_spacing = size // 16
    for i in range(4):
        line_width = doc_w * (0.7 - i * 0.05)
        draw.rectangle(
            [doc_x + size//20, doc_y + size//15 + i * line_spacing,
             doc_x + size//20 + line_width, doc_y + size//15 + i * line_spacing + line_height],
            fill=(255, 255, 255, 180)
        )
    
    # Draw checkmark circle
    circle_x = size * 2 // 3
    circle_y = size * 2 // 3
    circle_r = size // 6
    
    # Outer white circle
    draw.ellipse(
        [circle_x - circle_r, circle_y - circle_r,
         circle_x + circle_r, circle_y + circle_r],
        fill=(255, 255, 255, 255)
    )
    
    # Inner colored circle
    inner_r = int(circle_r * 0.7)
    draw.ellipse(
        [circle_x - inner_r, circle_y - inner_r,
         circle_x + inner_r, circle_y + inner_r],
        fill=(102, 126, 234, 255)
    )
    
    # Draw checkmark
    check_size = circle_r // 2
    check_points = [
        (circle_x - check_size * 0.3, circle_y),
        (circle_x - check_size * 0.1, circle_y + check_size * 0.3),
        (circle_x + check_size * 0.5, circle_y - check_size * 0.3)
    ]
    
    for i in range(len(check_points) - 1):
        draw.line(
            [check_points[i], check_points[i+1]],
            fill=(255, 255, 255, 255),
            width=max(2, stroke_width)
        )
    
    # Save the image
    img.save(filename, 'PNG')
    print(f'Created {filename}')

# Create icons directory if it doesn't exist
icons_dir = 'icons'
os.makedirs(icons_dir, exist_ok=True)

# Create icons in different sizes
sizes = [16, 48, 128]
for size in sizes:
    filename = os.path.join(icons_dir, f'icon{size}.png')
    create_icon(size, filename)

print('All icons created successfully!')
