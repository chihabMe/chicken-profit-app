import re

def refactor():
    with open('app/dashboard/client-page.tsx', 'r') as f:
        content = f.read()

    # 1. Inputs
    content = re.sub(r'<input\s+([^>]*)className="input-field"([^>]*)>', r'<Input \1 \2>', content)
    content = re.sub(r'<input\s+className="input-field"\s+([^>]*)>', r'<Input \1>', content)
    
    # 2. Buttons
    content = re.sub(r'<button\s+([^>]*)className="btn([^"]*)"([^>]*)>', r'<Button \1 variant="\2" \3>', content)
    content = re.sub(r'</button>', r'</Button>', content)
    
    # 3. Custom div classes to Tailwind
    content = content.replace('className="dashboard"', 'className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8"')
    content = content.replace('className="card"', 'className="rounded-xl border bg-card text-card-foreground shadow p-6 transition-all hover:shadow-lg"')
    content = content.replace('className="card input-section"', 'className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col gap-6"')
    content = content.replace('className="input-group"', 'className="flex flex-col gap-2"')
    content = content.replace('className="section-title"', 'className="text-2xl font-bold flex items-center gap-3 mb-6"')
    content = content.replace('className="kpi-grid"', 'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"')
    content = content.replace('className="kpi-card"', 'className="rounded-xl border bg-card text-card-foreground shadow p-6 relative overflow-hidden transition-all hover:scale-[1.02]"')
    content = content.replace('className="kpi-title"', 'className="text-sm font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wide"')
    content = content.replace('className="kpi-value"', 'className="text-4xl font-extrabold mt-2"')
    content = content.replace('className="kpi-subtext"', 'className="text-sm text-muted-foreground mt-1"')
    content = content.replace('className="charts-grid"', 'className="grid grid-cols-1 lg:grid-cols-2 gap-8"')
    content = content.replace('className="chart-container"', 'className="rounded-xl border bg-card text-card-foreground shadow p-6 h-[400px] flex flex-col"')
    content = content.replace('className="chart-header"', 'className="mb-6"')
    content = content.replace('className="chart-title"', 'className="text-xl font-bold"')
    content = content.replace('className="chart-body"', 'className="flex-1 w-full min-h-0"')
    
    # Remove variant=" primary" to variant="default"
    content = content.replace('variant=" primary"', 'variant="default"')
    content = content.replace('variant=""', 'variant="outline"')
    
    # Let's fix the select classes
    content = content.replace('className="form-input"', 'className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"')
    
    with open('app/dashboard/client-page.tsx', 'w') as f:
        f.write(content)
        
if __name__ == "__main__":
    refactor()
