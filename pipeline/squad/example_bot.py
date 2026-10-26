"""Example bot for any Revive kit game: look at window.State, move around, try the main keys.
Agents replace the loop body with their persona."""
import random


async def run(api):
    await api.key("Enter")
    await api.click(640, 360)
    while True:
        seen = await api.look()   # {"state": window.State (trimmed), "recent": last events, "canvas": [x, y, w, h]}
        await api.key(random.choice(["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "d", "a", "w", "s"]), 600)
        await api.key("Space")
        if (seen.get("recent") or [{}])[-1].get("type") == "death":
            api.note("died; check whether respawn works", "low")
        await api.wait(300)
