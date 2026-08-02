import os
import tempfile
from playwright.async_api import async_playwright

async def render_schedule_png(courses: list[dict], output_path: str):
    """
    Renders a weekly schedule as a PNG image using Playwright.
    """
    html_content = generate_schedule_html(courses)
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".html") as temp_html:
        temp_html.write(html_content.encode("utf-8"))
        temp_html_path = temp_html.name

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page(set_viewport_size={"width": 1200, "height": 800})
            await page.goto(f"file://{temp_html_path}")
            
            # Ensure fonts/styles load
            await page.wait_for_load_state("networkidle")
            
            # Take a screenshot of the main container
            element = await page.query_selector(".schedule-container")
            if element:
                await element.screenshot(path=output_path)
            else:
                await page.screenshot(path=output_path)
            
            await browser.close()
    finally:
        if os.path.exists(temp_html_path):
            os.remove(temp_html_path)

def generate_schedule_html(courses: list[dict]) -> str:
    # A simple HTML template with CSS for a weekly grid
    html = """
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; padding: 40px; }
            .schedule-container { background-color: white; padding: 40px; border-radius: 12px; border: 4px solid #141b2b; box-shadow: 8px 8px 0px 0px #141b2b; }
            h1 { text-transform: uppercase; font-style: italic; font-weight: 900; margin-bottom: 20px; color: #141b2b; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 2px solid #141b2b; padding: 10px; text-align: center; width: 20%; }
            th { background-color: #4F46E5; color: white; text-transform: uppercase; font-weight: bold; }
            td { background-color: white; }
            .course-block { background-color: #e0e7ff; color: #141b2b; padding: 12px; border-radius: 6px; margin-bottom: 10px; font-weight: bold; font-size: 14px; border: 2px solid #141b2b; box-shadow: 4px 4px 0px 0px #141b2b; text-align: left;}
            .time-text { font-size: 12px; font-weight: normal; margin-top: 4px; color: #4b5563; }
        </style>
    </head>
    <body>
        <div class="schedule-container">
            <h1>Weekly Schedule</h1>
            <table>
                <thead>
                    <tr>
                        <th>Monday</th>
                        <th>Tuesday</th>
                        <th>Wednesday</th>
                        <th>Thursday</th>
                        <th>Friday</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
    """
    
    days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    for day in days:
        html += "<td valign='top'>"
        day_courses = [c for c in courses if day in c.get("days", [])]
        day_courses.sort(key=lambda x: x.get("start_time", ""))
        
        for c in day_courses:
            room = c.get('room') or ''
            modality = c.get('modality') or ''
            room_text = f"{room} ({modality})" if room else modality
            
            html += f"""
            <div class="course-block">
                <div>{c.get('code', '')}</div>
                <div class="time-text">🕒 {c.get('start_time', '')[:5]} - {c.get('end_time', '')[:5]}</div>
                <div class="time-text">📍 {room_text}</div>
            </div>
            """
        html += "</td>"
        
    html += """
                    </tr>
                </tbody>
            </table>
        </div>
    </body>
    </html>
    """
    return html
