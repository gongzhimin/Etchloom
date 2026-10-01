"""
Met Museum Open Access Engraving & Print Dataset Downloader and Patch Slicer.
Downloads authentic public domain master engravings (Dürer, Rembrandt, etc.),
cleans borders, and slices into 256x256 patches for training and style modeling.
"""

import os
import json
import time
import urllib.request
import concurrent.futures
import numpy as np
from PIL import Image
from scipy.ndimage import uniform_filter


def guided_filter_fast(I, p, r=5, eps=0.5):
    size = 2 * r + 1
    mean_I = uniform_filter(I, size=size)
    mean_p = uniform_filter(p, size=size)
    corr_I = uniform_filter(I * I, size=size)
    corr_Ip = uniform_filter(I * p, size=size)
    var_I = corr_I - mean_I * mean_I
    cov_Ip = corr_Ip - mean_I * mean_p
    a = cov_Ip / (var_I + eps)
    b = mean_p - a * mean_I
    mean_a = uniform_filter(a, size=size)
    mean_b = uniform_filter(b, size=size)
    return np.clip(mean_a * I + mean_b, 0.0, 1.0)


def fetch_json(url, timeout=10):
    req = urllib.request.Request(url, headers={'User-Agent': 'EtchloomResearch/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return None


def search_met_engravings(max_count=80):
    print("[Met Museum API] Searching public domain engravings & etchings...")
    queries = ['engraving durer', 'etching rembrandt', 'woodcut durer']
    candidate_ids = []
    
    for q in queries:
        url = f"https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isPublicDomain=true&q={q.replace(' ', '+')}"
        data = fetch_json(url)
        if data and 'objectIDs' in data and data['objectIDs']:
            ids = data['objectIDs']
            print(f"  Query '{q}': found {len(ids)} objects")
            candidate_ids.extend(ids[:max_count])
            
    # Deduplicate while preserving order
    seen = set()
    unique_ids = []
    for oid in candidate_ids:
        if oid not in seen:
            seen.add(oid)
            unique_ids.append(oid)
            
    print(f"[Met Museum API] Total unique candidates: {len(unique_ids)}")
    return unique_ids


def get_artwork_details(object_id):
    url = f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}"
    data = fetch_json(url)
    if not data:
        return None
    
    # Must have image and be public domain
    img_url = data.get('primaryImage') or data.get('primaryImageSmall')
    if not img_url or not data.get('isPublicDomain', False):
        return None
        
    title = data.get('title', 'untitled').strip()
    artist = data.get('artistDisplayName', 'unknown').strip()
    medium = data.get('medium', '').strip()
    
    return {
        'id': object_id,
        'title': title,
        'artist': artist,
        'medium': medium,
        'image_url': img_url,
        'thumb_url': data.get('primaryImageSmall')
    }


def download_single_artwork(art_info, raw_dir):
    art_id = art_info['id']
    save_path = os.path.join(raw_dir, f"met_{art_id}.jpg")
    if os.path.isfile(save_path) and os.path.getsize(save_path) > 10000:
        return save_path, art_info
        
    url = art_info['image_url']
    req = urllib.request.Request(url, headers={'User-Agent': 'EtchloomResearch/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = resp.read()
            if len(data) > 5000:
                with open(save_path, 'wb') as f:
                    f.write(data)
                return save_path, art_info
    except Exception as e:
        # Fallback to thumbnail if high-res times out
        if art_info.get('thumb_url'):
            try:
                req_t = urllib.request.Request(art_info['thumb_url'], headers={'User-Agent': 'EtchloomResearch/1.0'})
                with urllib.request.urlopen(req_t, timeout=15) as resp:
                    data = resp.read()
                    with open(save_path, 'wb') as f:
                        f.write(data)
                    return save_path, art_info
            except:
                pass
    return None, art_info


def slice_into_training_patches(img_path, patch_size=256, stride=192, output_dir=None):
    """
    Slices raw master print scan into 256x256 patches.
    Filters out blank white margins and uniform flat darks.
    Extracts triplet:
      - raw_patch.png (Target shading)
      - tone_patch.png (Guided filter tone)
      - edge_patch.png (Boundary edge)
    """
    try:
        im = Image.open(img_path).convert('L')
    except Exception:
        return 0
        
    arr = np.array(im, dtype=np.float32) / 255.0
    h, w = arr.shape
    if h < patch_size or w < patch_size:
        return 0
        
    patches_saved = 0
    base = os.path.splitext(os.path.basename(img_path))[0]
    
    # Subdirectories for paired training
    dir_target = os.path.join(output_dir, 'target')
    dir_tone = os.path.join(output_dir, 'tone')
    dir_edge = os.path.join(output_dir, 'edge')
    os.makedirs(dir_target, exist_ok=True)
    os.makedirs(dir_tone, exist_ok=True)
    os.makedirs(dir_edge, exist_ok=True)

    for y in range(0, h - patch_size + 1, stride):
        for x in range(0, w - patch_size + 1, stride):
            crop = arr[y:y+patch_size, x:x+patch_size]
            mean_val = float(crop.mean())
            std_val = float(crop.std())
            
            # Filter criteria: reject blank white paper borders (std < 0.05, mean > 0.90)
            # or completely solid pitch black borders (mean < 0.05)
            if std_val < 0.06 or mean_val > 0.92 or mean_val < 0.05:
                continue
                
            # Tone via Guided Filter
            crop_tone = guided_filter_fast(crop, crop, r=5, eps=0.5)
            
            # High-frequency edge (difference or gradient)
            edge_val = np.clip(1.0 - np.abs(crop - crop_tone) * 2.0, 0.0, 1.0)
            
            pid = f"{base}_y{y}_x{x}"
            Image.fromarray((crop * 255.0).astype(np.uint8)).save(os.path.join(dir_target, f"{pid}.png"))
            Image.fromarray((crop_tone * 255.0).astype(np.uint8)).save(os.path.join(dir_tone, f"{pid}.png"))
            Image.fromarray((edge_val * 255.0).astype(np.uint8)).save(os.path.join(dir_edge, f"{pid}.png"))
            patches_saved += 1
            
            if patches_saved >= 40: # cap per high-res image to maintain diversity
                break
        if patches_saved >= 40:
            break
            
    return patches_saved


def main(target_count=60):
    raw_dir = 'data/engravings_raw'
    patch_dir = 'data/engravings_patches'
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(patch_dir, exist_ok=True)

    object_ids = search_met_engravings(max_count=target_count * 2)
    print(f"\n[Met Museum] Fetching metadata for up to {len(object_ids)} items...")

    artworks = []
    # Concurrently fetch metadata
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(get_artwork_details, oid): oid for oid in object_ids}
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res:
                artworks.append(res)
                if len(artworks) >= target_count:
                    break

    print(f"[Met Museum] Successfully validated {len(artworks)} public domain engravings with images.")
    
    # Save metadata log
    with open(os.path.join(raw_dir, 'metadata.json'), 'w', encoding='utf-8') as f:
        json.dump(artworks, f, ensure_ascii=False, indent=2)

    # Concurrently download images
    print(f"\n[Met Museum] Downloading {len(artworks)} master engraving scans...")
    downloaded = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(download_single_artwork, art, raw_dir): art for art in artworks}
        for i, future in enumerate(concurrent.futures.as_completed(futures)):
            path, art = future.result()
            if path:
                downloaded.append(path)
                sz_mb = os.path.getsize(path) / (1024 * 1024)
                print(f"  [{len(downloaded)}/{len(artworks)}] Downloaded: {art['artist']} - {art['title'][:30]} ({sz_mb:.2f} MB)")

    print(f"\n[Dataset] Finished downloading {len(downloaded)} master prints.")
    
    # Slice into patches
    print(f"[Dataset] Slicing into 256x256 paired training patches...")
    total_patches = 0
    for p in downloaded:
        n = slice_into_training_patches(p, patch_size=256, stride=192, output_dir=patch_dir)
        total_patches += n

    print(f"\n[Dataset Ready] Successfully generated {total_patches} high-quality engraving patches in '{patch_dir}'.")
    print(f"  - Target (raw master hatching): {patch_dir}/target")
    print(f"  - Tone (guided filter): {patch_dir}/tone")
    print(f"  - Edge (structural boundary): {patch_dir}/edge")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--count', type=int, default=60, help='Number of engravings to download')
    args = parser.parse_args()
    main(target_count=args.count)
