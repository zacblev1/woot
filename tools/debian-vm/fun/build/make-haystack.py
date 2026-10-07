"""Generate the treasure hunt's haystack: N files of hay, one holding the needle.

usage: make-haystack.py <out-dir> <needle-file> [count]
Deterministic (fixed seed) so image builds are reproducible.
"""
import os
import random
import sys

out, needle_path = sys.argv[1], sys.argv[2]
count = int(sys.argv[3]) if len(sys.argv) > 3 else 1000
rng = random.Random(42)
words = ["hay", "hay", "hay", "straw", "hay", "chaff", "hay", "dust", "hay", "a-very-confused-ant"]

os.makedirs(out, exist_ok=True)
lucky = rng.randrange(count)
needle = open(needle_path).read()
for i in range(count):
    path = os.path.join(out, f"bale-{i:04d}.txt")
    with open(path, "w") as f:
        if i == lucky:
            f.write(needle)
        else:
            for _ in range(rng.randint(3, 12)):
                f.write(" ".join(rng.choice(words) for _ in range(rng.randint(4, 10))) + "\n")
