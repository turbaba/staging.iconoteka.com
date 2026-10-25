#!/usr/bin/env python3
"""Post the Instagram stories that are due, through Instagram's own publishing API.

Run by .github/workflows/stories.yml every half hour. schedule.json lists every story: when it goes
out and the clips it is made of, in the order they play; posted.json is the ledger of what went
out, so a run never posts anything twice and a run that failed half way picks up where it stopped.

posts.json holds one-off posts beside the series (schedule.json is rebuilt from the series'
calendars, so nothing hand-added lives there). An entry with "kind": "reel" goes to the feed as a
video post with its "caption", the rest are stories.

  IG_TOKEN       a Meta system user token with instagram_basic, instagram_content_publish,
                 pages_show_list and pages_read_engagement (a GitHub secret)
  IG_USERNAME    the account to post as, iconoteka unless set
  DRY_RUN=1      say what would go out, post nothing
"""
import json, os, sys, time, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
GRAPH = "https://graph.facebook.com/v23.0"
HOST = "https://staging.iconoteka.com/"          # where the clips are served from
LATE = timedelta(hours=6)                        # a story more than this late is skipped, not sent
DRY = os.environ.get("DRY_RUN") == "1"

def call(method, path, **params):
    params["access_token"] = os.environ["IG_TOKEN"]
    data = urllib.parse.urlencode(params).encode()
    url = f"{GRAPH}/{path}"
    req = (urllib.request.Request(url, data=data, method="POST") if method == "POST"
           else urllib.request.Request(f"{url}?{data.decode()}"))
    try:
        return json.load(urllib.request.urlopen(req, timeout=90))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {path}: {e.code} {e.read().decode()[:400]}") from None

def account():
    """The Instagram account's id, found through the Pages the token can see."""
    want = os.environ.get("IG_USERNAME", "iconoteka")
    pages = call("GET", "me/accounts", fields="name,instagram_business_account{id,username}")["data"]
    for p in pages:
        ig = p.get("instagram_business_account") or {}
        if ig.get("username") == want:
            return ig["id"]
    raise RuntimeError(f"no Instagram account @{want} behind the token's Pages: {[p['name'] for p in pages]}")

def story(ig, url):
    """One clip as a story: a container, Instagram's own processing, then the publish."""
    box = call("POST", f"{ig}/media", media_type="STORIES", video_url=url)["id"]
    for _ in range(40):                          # up to ten minutes, checked every 15 seconds
        state = call("GET", box, fields="status_code,status")
        if state.get("status_code") == "FINISHED":
            return call("POST", f"{ig}/media_publish", creation_id=box)["id"]
        if state.get("status_code") in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"{url}: {state}")
        time.sleep(15)
    raise RuntimeError(f"{url}: still processing after ten minutes")

def reel(ig, url, caption):
    """One video to the feed (Instagram takes feed videos as reels, shown in the feed too)."""
    box = call("POST", f"{ig}/media", media_type="REELS", video_url=url, caption=caption, share_to_feed="true")["id"]
    for _ in range(40):
        state = call("GET", box, fields="status_code,status")
        if state.get("status_code") == "FINISHED":
            return call("POST", f"{ig}/media_publish", creation_id=box)["id"]
        if state.get("status_code") in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"{url}: {state}")
        time.sleep(15)
    raise RuntimeError(f"{url}: still processing after ten minutes")

def main():
    sched = json.load(open(os.path.join(HERE, "schedule.json")))["stories"]
    extra = os.path.join(HERE, "posts.json")
    if os.path.exists(extra):
        sched = sched + json.load(open(extra))["posts"]
    ledger_file = os.path.join(HERE, "posted.json")
    ledger = json.load(open(ledger_file)) if os.path.exists(ledger_file) else {}
    now = datetime.now(timezone.utc)
    due = [s for s in sched if datetime.fromisoformat(s["at"]) <= now
           and len(ledger.get(s["id"], {}).get("media", [])) < len(s["shots"])]
    if not due and not DRY:
        print("nothing due"); return
    ig = account()                               # a dry run still proves the token reaches the account
    print(f"posting as Instagram account {ig}")
    for s in due:
        at = datetime.fromisoformat(s["at"])
        done = ledger.setdefault(s["id"], {"media": []})
        if not done["media"] and now - at > LATE:
            done["skipped"] = f"{now:%Y-%m-%d %H:%M}Z, {now - at} late"
            print(f"{s['id']}: skipped, {now - at} late"); continue
        for i, shot in enumerate(s["shots"]):
            if i < len(done["media"]):
                continue                         # went out on an earlier run
            url = HOST + shot
            if DRY:
                print(f"{s['id']}: would post {url}"); continue
            media = reel(ig, url, s.get("caption", "")) if s.get("kind") == "reel" else story(ig, url)
            done["media"].append(media)
            done["at"] = f"{datetime.now(timezone.utc):%Y-%m-%d %H:%M}Z"
            json.dump(ledger, open(ledger_file, "w"), indent=1)   # saved after every clip
            print(f"{s['id']}: posted {shot} as {media}")
            if i < len(s["shots"]) - 1:
                time.sleep(20)                   # the next clip of the same story after this one
    if not DRY:
        json.dump(ledger, open(ledger_file, "w"), indent=1)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("FAILED:", e); sys.exit(1)
