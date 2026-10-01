import numpy as np
from PIL import Image
from scipy.ndimage import uniform_filter, gaussian_filter
import torch

def guided_filter(I, p, r=5, eps=0.5):
    """
    Pure NumPy guided filter (He et al. ECCV 2010).
    I: guidance grayscale image in [0, 1]
    p: input grayscale image in [0, 1]
    r: filter radius (default 5, window 11x11 matching Im2Pencil)
    eps: regularization parameter (default 0.5 matching Im2Pencil)
    """
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
    q = mean_a * I + mean_b
    return np.clip(q, 0.0, 1.0)

def extract_tone(img_pil, r=5, eps=0.5):
    gray = np.array(img_pil.convert('L'), dtype=np.float32) / 255.0
    gf = guided_filter(gray, gray, r=r, eps=eps)
    return (gf * 255.0).astype(np.uint8)

def vectorized_xdog(im_u8, Sigma=1.0):
    Gamma = 0.99
    Phi = 200.0
    Epsilon = 0.1
    k = 1.6
    if im_u8.ndim == 3:
        im = im_u8[:, :, 0].astype(np.float32)
    else:
        im = im_u8.astype(np.float32)
    im2 = gaussian_filter(im, Sigma)
    im3 = gaussian_filter(im, Sigma * k)
    diff = im2 - (Gamma * im3)
    res = np.where(diff >= Epsilon, 255.0, 1.0 + np.tanh(Phi * (diff - Epsilon)))
    result = np.clip(res, 0, 255).astype(np.uint8)
    return np.repeat(result[:, :, None], 3, axis=2)

def prepare_inputs(img_path_or_pil, outline_style=0, shading_style=1, factor=16, sigma=1.0):
    if isinstance(img_path_or_pil, str):
        im = Image.open(img_path_or_pil).convert('RGB')
    else:
        im = img_path_or_pil.convert('RGB')
        
    w, h = im.size
    h = int(round(h * 1.0 / factor) * factor)
    w = int(round(w * 1.0 / factor) * factor)
    im = im.resize((w, h), Image.BICUBIC)
    
    tone_u8 = extract_tone(im)
    tone_rgb = np.repeat(tone_u8[:, :, None], 3, axis=2)
    tone_pil = Image.fromarray(tone_u8)
    
    gray = np.array(im.convert('L'), dtype=np.float32)
    gx = gaussian_filter(gray, 1, order=(0, 1))
    gy = gaussian_filter(gray, 1, order=(1, 0))
    mag = np.hypot(gx, gy)
    mag = np.clip(mag / (mag.max() + 1e-5) * 255.0, 0, 255).astype(np.uint8)
    edge_u8 = 255 - mag
    edge_rgb = np.repeat(edge_u8[:, :, None], 3, axis=2)
    edge_pil = Image.fromarray(edge_u8)
    
    xdog_rgb = vectorized_xdog(edge_rgb, Sigma=sigma)
    
    to_tensor = lambda arr: (torch.from_numpy(arr.transpose(2, 0, 1)).float() / 255.0 - 0.5) / 0.5
    imgE_xdog_t = to_tensor(xdog_rgb).unsqueeze(0)
    imgE_t = to_tensor(edge_rgb).unsqueeze(0)
    imgS_t = to_tensor(tone_rgb).unsqueeze(0)
    
    unitE_t = torch.zeros(1, 2, h // 4, w // 4)
    unitE_t[0, outline_style].fill_(1.0)
    
    unitS_t = torch.zeros(1, 4, h // 4, w // 4)
    unitS_t[0, shading_style].fill_(1.0)
    
    return {
        'imgE_xdog': imgE_xdog_t,
        'unitE': unitE_t,
        'imgE': imgE_t,
        'unitS': unitS_t,
        'imgS': imgS_t,
        'raw_pil': im,
        'edge_pil': edge_pil,
        'tone_pil': tone_pil,
        'xdog_pil': Image.fromarray(xdog_rgb)
    }
