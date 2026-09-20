#!/usr/bin/env python3
"""Landschaft auf Papier: Weiß zu Alpha, Beschnitt und WebP-/AVIF-Export.

Python 3.10+, Pillow 11.3+ und NumPy; AVIF wird bei verfügbarem Encoder ergänzt.
Vom Repository-Stamm aus:
  python3 tools/landschaft-bilder.py
  python3 tools/landschaft-bilder.py --season winter --crown /pfad/krone.png \
      --distance /pfad/ferne.png --skip-birds

Die sechs unveränderten Bestandsdateien werden aus assets/bestand/ gelesen.
Fehlen sie beim ersten Lauf, werden sie aus dem festgelegten Git-Stand restauriert.
Die Originalbilder im Vault werden ausschließlich gelesen.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, features, __version__ as pillow_version

REPO = Path(__file__).resolve().parent.parent
SOURCE_DIR = Path.home() / 'Documents/Second Brain/90_Meta/Design/Entwuerfe'
ORIGINAL_REF = '1204f11'
ORIGINALS = {
    'ast.webp': '1ba54a5f8bc67c1c8e00cff017eca25c4b99ab0a9151539d21896c1b25cb627d',
    'vogel.webp': 'aa83e830d9d9cba3847e67d778d3eb163ad3da0caece99f978187ac1eebc8576',
    'flugpose-1-aufschlag.webp': '89632a73b3c5b07d97a1d5831ed069218501cbb265f773dc09ae9415fab63682',
    'flugpose-2-gleiten.webp': 'ccaa59ed3d1a6440b517aadcfe6f62db8125438e735f5972877ecc80b2ba04f9',
    'flugpose-3-abschlag.webp': 'd4f05c80bd5eedbb9eb898688ba112fec0237233b49b53afee73b0ecf74673e9',
    'flugpose-4-landeanflug.webp': '2f5a953d78db8e0a812111bc434f86ca4d7531b2467c654718b394352438dd00',
}
PAPER = np.array([243, 239, 229], dtype=np.float32)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def preserve_originals(repo: Path) -> dict:
    folder = repo / 'assets/bestand'
    folder.mkdir(parents=True, exist_ok=True)
    checks = {}
    for name, expected in ORIGINALS.items():
        path = folder / name
        data = path.read_bytes() if path.exists() else subprocess.check_output(
            ['git', 'show', f'{ORIGINAL_REF}:assets/{name}'], cwd=repo)
        if digest(data) != expected:
            raise ValueError(f'Bestandsquelle verändert: {path}')
        if not path.exists():
            path.write_bytes(data)
        checks[name] = {'bytes': len(data), 'sha256': expected, 'byte_identical_to_git': True}
    return checks


def white_to_alpha(image: Image.Image) -> Image.Image:
    """GIMP-artig: a=1-min(c)/255; f=(c-(1-a)*255)/a, ohne Maskenhalo."""
    source = np.asarray(image.convert('RGBA'), dtype=np.float32)
    rgb = source[:, :, :3]
    low = rgb.min(axis=2)
    alpha = 1.0 - low / 255.0
    # Neutrales PNG-/WebP-Weißrauschen darf keinen grauen Flächenschleier bilden.
    near_white = (low >= 250.0) & (rgb.max(axis=2) - low <= 5.0)
    alpha[near_white] = 0.0
    foreground = np.zeros_like(rgb)
    np.divide(rgb - (1.0 - alpha[:, :, None]) * 255.0,
              alpha[:, :, None], out=foreground, where=alpha[:, :, None] > 0)
    alpha *= source[:, :, 3] / 255.0
    out = np.dstack((np.clip(foreground, 0, 255), alpha * 255.0))
    return Image.fromarray(np.rint(out).astype(np.uint8), 'RGBA')


def bbox_below_white(image: Image.Image, threshold: int = 245) -> tuple[int, int, int, int]:
    rgb = np.asarray(image.convert('RGB'))
    y, x = np.where(rgb.min(axis=2) < threshold)
    if len(x) == 0:
        raise ValueError('Quelle enthält keinen Bildinhalt unter dem Weiß-Schwellwert.')
    return int(x.min()), int(y.min()), int(x.max()) + 1, int(y.max()) + 1


def crop_for(image: Image.Image, kind: str) -> tuple[int, int, int, int]:
    left, top, right, bottom = bbox_below_white(image)
    width, height = image.size
    if kind == 'krone':
        # Randkontakt oben/rechts bleibt erhalten, Blattspitzen links/unten mit Luft.
        pad = max(4, round(height * 0.008))
        return max(0, left-pad), max(0, top-pad), min(width, right+pad), min(height, bottom+pad)
    # Sehr blasse seitliche Höhenzüge bleiben erhalten; nur leeren Himmel entfernen.
    pad = max(8, round(height * 0.024))
    crop_top = max(0, top-pad)
    crop_height = max(round(width/3.8), bottom + pad - crop_top)
    if crop_top + crop_height > height:
        crop_top = max(0, height-crop_height)
    return 0, crop_top, width, min(height, crop_top+crop_height)


def soften_edges(image: Image.Image, horizontal: float = 0.025, vertical: float = 0.025) -> Image.Image:
    """Nur den Auslauf der Ferne zur transparenten Begrenzung weich schließen."""
    pixels = np.array(image)
    width, height = image.size
    x = np.minimum(np.arange(width), np.arange(width)[::-1]) / max(1, round(width*horizontal))
    y = np.minimum(np.arange(height), np.arange(height)[::-1]) / max(1, round(height*vertical))
    sx = np.clip(x, 0, 1); sy = np.clip(y, 0, 1)
    sx = sx*sx*(3-2*sx); sy = sy*sy*(3-2*sy)
    pixels[:, :, 3] = np.rint(pixels[:, :, 3] * sy[:, None] * sx[None, :]).astype(np.uint8)
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, 'RGBA')


def source_stats(path: Path, image: Image.Image) -> dict:
    rgb = np.asarray(image.convert('RGB'))
    white = rgb.min(axis=2) >= 250
    try:
        label = str(path.relative_to(REPO))
    except ValueError:
        label = path.name
    return {
        'source': label,
        'source_sha256': digest(path.read_bytes()),
        'source_bytes': path.stat().st_size,
        'source_size': list(image.size),
        'source_mode': image.mode,
        'white_threshold_rgb_each_channel_at_least': 250,
        'source_white_fraction': round(float(white.mean()), 6),
        'source_white_mean_rgb': np.round(rgb[white].mean(axis=0), 4).tolist() if white.any() else None,
        'content_bbox_threshold_min_channel_below': 245,
        'content_bbox': list(bbox_below_white(image)),
    }


def alpha_stats(image: Image.Image) -> dict:
    alpha = np.asarray(image.convert('RGBA'))[:, :, 3]
    return {
        'alpha_min': int(alpha.min()), 'alpha_max': int(alpha.max()),
        'alpha_mean': round(float(alpha.mean()), 4),
        'transparent_fraction': round(float((alpha == 0).mean()), 6),
        'partial_alpha_fraction': round(float(((alpha > 0) & (alpha < 255)).mean()), 6),
    }


def composite(pixels: np.ndarray, background: np.ndarray) -> np.ndarray:
    alpha = pixels[:, :, 3:] / 255.0
    return pixels[:, :, :3] * alpha + background * (1-alpha)


def export(image: Image.Image, destination: Path, quality: int, byte_limit: int | None = None, alpha_quality: int = 100) -> dict:
    settings = {'format': 'WEBP', 'quality': quality, 'method': 6, 'exact': False, 'alpha_quality': alpha_quality}
    if destination.suffix == '.avif':
        settings = {'format': 'AVIF', 'quality': quality, 'speed': 4, 'subsampling': '4:2:0'}
    buffer = io.BytesIO()
    image.save(buffer, **settings)
    encoded = buffer.getvalue()
    if byte_limit and len(encoded) > byte_limit:
        raise ValueError(f'{destination.name}: {len(encoded)} Bytes überschreiten {byte_limit} Bytes.')
    destination.write_bytes(encoded)
    decoded = Image.open(io.BytesIO(encoded)).convert('RGBA')
    before = np.asarray(image, dtype=np.float32)
    after = np.asarray(decoded, dtype=np.float32)
    paper_error = abs(composite(before, PAPER) - composite(after, PAPER))
    return {
        'file': 'assets/' + destination.name,
        'size': list(image.size), 'bytes': len(encoded), 'quality': quality,
        'alpha_quality': alpha_quality if destination.suffix == '.webp' else 'AVIF quality',
        'sha256': digest(encoded), 'byte_limit': byte_limit,
        'paper_composite_mean_abs_error_rgb': round(float(paper_error.mean()), 5),
        **alpha_stats(decoded),
    }


def build_landscape(path: Path, kind: str, season: str, output: Path, avif: bool) -> dict:
    source = Image.open(path)
    report = source_stats(path, source)
    crop = crop_for(source, kind)
    cropped = source.crop(crop)
    report.update({'crop': list(crop), 'cropped_size': list(cropped.size),
                   'horizontal_edge_fade_fraction': 0.025 if kind == 'ferne' else 0,
                   'vertical_edge_fade_fraction': 0.025 if kind == 'ferne' else 0,
                   'outputs': []})
    sizes = [1000, 560] if kind == 'krone' else [1400, 800]
    budget = 120000 if kind == 'krone' else 150000
    for width in sizes:
        height = round(width * cropped.height / cropped.width)
        radius = (1.0 if width == 1000 else 0.5) if kind == 'krone' else 0.0
        # Ein Pixel Vorfilter ist bei 450–550 CSS-Pixeln ca. ein halber Bildschirmpixel.
        resized_source = cropped.resize((width, height), Image.Resampling.LANCZOS)
        if radius:
            resized_source = resized_source.filter(ImageFilter.GaussianBlur(radius))
        cutout = white_to_alpha(resized_source)
        if kind == 'ferne':
            cutout = soften_edges(cutout)
        for ext in ['webp', *(['avif'] if avif else [])]:
            name = f'{kind}-{season}-{width}.{ext}'
            entry = export(cutout, output/name, 82 if ext == 'avif' else 83,
                           budget, 40 if kind == 'krone' else 100)
            entry['source_prefilter_gaussian_radius_px_at_export_size'] = radius
            report['outputs'].append(entry)
    return report


def build_birds(repo: Path, output: Path) -> list[dict]:
    reports = []
    for name in ORIGINALS:
        if name == 'ast.webp':
            continue
        path = repo / 'assets/bestand' / name
        source = Image.open(path)
        cutout = white_to_alpha(source.filter(ImageFilter.GaussianBlur(1.0)))
        report = source_stats(path, source)
        report['source_prefilter_gaussian_radius_px_at_original_size'] = 1.0
        report['crop'] = [0, 0, *source.size]
        report['outputs'] = [export(cutout, output/name, 83, alpha_quality=40)]
        reports.append(report)
    total = sum(r['outputs'][0]['bytes'] for r in reports)
    if total > 600000:
        raise ValueError(f'Vögel überschreiten 600000 Bytes: {total}')
    return reports


def build_branch(path: Path, repo: Path, output: Path) -> dict:
    source=Image.open(path)
    original_path = repo/'assets/bestand/ast.webp'
    original=np.asarray(Image.open(original_path).convert('RGBA'),dtype=np.float32)
    start=864; blend=136; width=2800; height=167
    crop=(round(source.width*950/2172),round(source.height*270/724),source.width,round(source.height*410/724))
    cut=white_to_alpha(source).crop(crop)
    scale=(width-start)/cut.width
    cut=cut.resize((width-start,round(cut.height*scale)),Image.Resampling.LANCZOS)
    new=np.asarray(cut,dtype=np.float32)
    def center(column):
     weight=column[:,3]/255.0*(1-column[:,:3].mean(1)/255.0)
     smooth=np.convolve(weight,np.ones(15),'same'); peak=np.argmax(smooth)
     lo=max(0,peak-11); hi=min(len(weight),peak+12)
     return float(np.average(np.arange(lo,hi),weights=weight[lo:hi]))
    old_center=np.array([center(original[:,x]) for x in range(start,start+blend)])
    new_center=np.array([center(new[:,x]) for x in range(new.shape[1])])
    base_shift=old_center[0]-new_center[0]
    shift=np.full(new.shape[1],base_shift)
    shift[:blend]=old_center-new_center[:blend]
    end=min(new.shape[1],blend+250)
    t=np.linspace(0,1,end-blend); t=t*t*(3-2*t)
    shift[blend:end]=shift[blend-1]*(1-t)+base_shift*t
    rows=np.arange(height)
    extension=np.zeros((height,width-start,4),dtype=np.float32)
    for x in range(new.shape[1]):
     # Die Anschlussstärke nähert sich innerhalb des Übergangs der neuen Zeichnung an.
     strength=0.65+0.35*min(1,x/250)
     sample=(rows-shift[x]-new_center[x])/strength+new_center[x]
     for channel in range(4):
      extension[:,x,channel]=np.interp(sample,np.arange(new.shape[0]),new[:,x,channel],left=0,right=0)
    result=np.zeros((height,width,4),dtype=np.float32)
    result[:,:start]=original[:,:start]
    result[:,start:]=extension
    # Farb- und Alphablende in vormultiplizierter Darstellung vermeidet doppelte Astkanten.
    left=original[:,start:start+blend].copy()/255.0;right=extension[:,:blend].copy()/255.0
    left[:,:,:3]*=left[:,:,3:];right[:,:,:3]*=right[:,:,3:]
    t=np.linspace(0,1,blend)[None,:,None]; t=t*t*(3-2*t)
    mix=left*(1-t)+right*t
    np.divide(mix[:,:,:3],mix[:,:,3:],out=mix[:,:,:3],where=mix[:,:,3:]>0)
    result[:,start:start+blend]=mix*255
    result=np.rint(np.clip(result,0,255)).astype(np.uint8)
    result[:,:start]=original[:,:start].astype(np.uint8)
    image = Image.fromarray(result, 'RGBA')
    destination = output/'ast.webp'
    image.save(destination, lossless=True, quality=100, method=6, exact=True)
    decoded = Image.open(destination).convert('RGBA')
    original_prefix = original[:, :start].astype(np.uint8).tobytes()
    output_prefix = np.asarray(decoded)[:, :start].tobytes()
    if output_prefix != original_prefix:
        raise ValueError('Ast-Präfix wurde beim Export verändert.')
    report = source_stats(path, source)
    report.update({
        'generation_provenance': 'OpenAI Imagegen, 20.09.2026, exec-4f13beb2-c737-4585-8a67-9ac03f1016d9',
        'source_storage': 'tools/landschaft-ast-quelle.webp: verlustfreie RGB-Kopie der generierten PNG-Quelle',
        'crop': list(crop), 'extension_uniform_scale': scale,
        'original_prefix_width': start, 'original_prefix_height': height,
        'blend_x_start_inclusive': start, 'blend_x_end_exclusive': start+blend,
        'join': 'Hauptlinie spaltenweise ausgerichtet, lokale Aststärke 0.65→1 über 250px, vormultiplizierte Alphablende.',
        'original_prefix_rgba_sha256': digest(original_prefix),
        'output_prefix_rgba_sha256': digest(output_prefix),
        'prefix_pixels_identical_fraction': 1.0,
        'outputs': [{
            'file': 'assets/ast.webp', 'size': [width, height],
            'bytes': destination.stat().st_size, 'sha256': digest(destination.read_bytes()),
            'lossless': True, 'exact': True, **alpha_stats(decoded),
        }],
    })
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--season', default='herbst', help='ASCII-Jahreszeit im Ausgabedateinamen')
    parser.add_argument('--crown', type=Path, help='Original-PNG der Krone')
    parser.add_argument('--distance', type=Path, help='Original-PNG der Ferne')
    parser.add_argument('--branch', type=Path, help='Quellbild der rechten Astverlängerung')
    parser.add_argument('--skip-branch', action='store_true')
    parser.add_argument('--skip-crown', action='store_true')
    parser.add_argument('--skip-distance', action='store_true')
    parser.add_argument('--skip-birds', action='store_true')
    parser.add_argument('--no-avif', action='store_true')
    parser.add_argument('--repo', type=Path, default=REPO, help=argparse.SUPPRESS)
    parser.add_argument('--output-dir', type=Path, help='QA-Ausgabeordner; Standard: assets/')
    parser.add_argument('--report', type=Path, help='Standard: tools/landschaft-bilder.json')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', args.season):
        parser.error('--season benötigt Kleinbuchstaben/Ziffern und optionale Bindestriche.')
    if args.season != 'herbst':
        if not args.skip_crown and not args.crown:
            parser.error('Andere Jahreszeiten benötigen --crown oder --skip-crown.')
        if not args.skip_distance and not args.distance:
            parser.error('Andere Jahreszeiten benötigen --distance oder --skip-distance.')
    repo = args.repo.resolve()
    output = args.output_dir or repo/'assets'
    report_path = args.report or repo/'tools/landschaft-bilder.json'
    crown = args.crown or SOURCE_DIR/'16_Krone_Herbst.png'
    distance = args.distance or SOURCE_DIR/'17_Ferne_Herbst.png'
    branch = args.branch or repo/'tools/landschaft-ast-quelle.webp'
    for path, skip in [(crown, args.skip_crown), (distance, args.skip_distance), (branch, args.skip_branch)]:
        if not skip and not path.is_file():
            parser.error(f'Quelldatei fehlt: {path}')
    output.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    avif = not args.no_avif and features.check('avif')
    report = {
        'pipeline_version': 2, 'season': args.season,
        'runtime': {'pillow': pillow_version, 'numpy': np.__version__, 'avif_encoder': avif},
        'method': {
            'color_to_alpha': 'a = 1 - min(R,G,B)/255; f = (rgb - (1-a)*255)/a',
            'near_white_cleanup': 'min(R,G,B) >= 250 und max(rgb)-min(rgb) <= 5 → Alpha 0',
            'existing_alpha': 'Ausgangsalpha wird multipliziert; Vögel immer aus unverändertem Bestand.',
            'resampling': 'Lanczos; source RGB vor CTA; Ast RGBA/Pillow (vorgewichtetes Alpha)',
            'prefilter': 'Krone 1px bei 1000px, 0.5px bei 560px; Vögel 1px bei nativer Größe; Ferne ohne Vorfilter.',
            'webp_alpha_quality': '40 für Krone/Vögel, 100 für Ferne; Ast vollständig verlustfrei.',
            'avif': 'Qualität 82, speed 4, YUV 4:2:0',
            'webp_rgb_quality': 83, 'paper_rgb': PAPER.astype(int).tolist(),
            'crop_coordinates': '[links, oben, rechts exklusiv, unten exklusiv]',
            'fallback': f'assets/bestand enthält byteidentische Originale aus Git {ORIGINAL_REF}.',
        },
        'originals': preserve_originals(repo), 'images': [],
    }
    if not args.skip_crown:
        report['images'].append(build_landscape(crown, 'krone', args.season, output, avif))
    if not args.skip_distance:
        report['images'].append(build_landscape(distance, 'ferne', args.season, output, avif))
    if not args.skip_birds:
        report['images'].extend(build_birds(repo, output))
    if not args.skip_branch:
        report['images'].append(build_branch(branch, repo, output))
    report['available_seasons'] = sorted({p.name[len('krone-'):-len('-1000.webp')] for p in output.glob('krone-*-1000.webp')} & {p.name[len('ferne-'):-len('-1400.webp')] for p in output.glob('ferne-*-1400.webp')})
    outputs = [o for entry in report['images'] for o in entry['outputs']]
    report['total_output_bytes'] = sum(o['bytes'] for o in outputs)
    report['bird_webp_bytes'] = sum(o['bytes'] for o in outputs if Path(o['file']).name in ORIGINALS and Path(o['file']).name != 'ast.webp')
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for item in outputs:
        print(f"{item['file']}: {item['size'][0]}×{item['size'][1]}, {item['bytes']} Bytes")
    print(f"Gesamt: {report['total_output_bytes']} Bytes; Bericht: {report_path}")


if __name__ == '__main__':
    main()
