"""Example bot: wander, harvest the nearest thing, say hi. Agents replace this with a persona-specific bot."""


async def run(api):
    await api.chat("hi")
    while True:
        seen = await api.look()
        target = next((o for o in seen.get("nearby", []) if o["dist"] > 40), None)
        if target:
            await api.key("ArrowRight" if target["x"] > seen["x"] else "ArrowLeft", min(1500, target["dist"] * 4))
            await api.click_world(target["x"], target["y"] - 30)
            await api.wait(600)
            await api.click_text("Harvest") or await api.click_text("Mine") or await api.click_text("Pet")
        else:
            await api.key("Space")
        await api.wait(800)
