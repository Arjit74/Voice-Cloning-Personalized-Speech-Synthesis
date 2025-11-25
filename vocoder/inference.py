from vocoder.models.fatchord_version import WaveRNN
from vocoder import hparams as hp
import torch


_model = None   # type: WaveRNN

def load_model(weights_fpath, verbose=True):
    global _model, _device
    
    if verbose:
        print("Building Wave-RNN")
    _model = WaveRNN(
        rnn_dims=hp.voc_rnn_dims,
        fc_dims=hp.voc_fc_dims,
        bits=hp.bits,
        pad=hp.voc_pad,
        upsample_factors=hp.voc_upsample_factors,
        feat_dims=hp.num_mels,
        compute_dims=hp.voc_compute_dims,
        res_out_dims=hp.voc_res_out_dims,
        res_blocks=hp.voc_res_blocks,
        hop_length=hp.hop_length,
        sample_rate=hp.sample_rate,
        mode=hp.voc_mode
    )

    if torch.cuda.is_available():
        _model = _model.cuda()
        _device = torch.device('cuda')
    else:
        _device = torch.device('cpu')
    
    if verbose:
        print("Loading model weights at %s" % weights_fpath)
    checkpoint = torch.load(weights_fpath, _device)
    _model.load_state_dict(checkpoint['model_state'])
    _model.eval()


def is_loaded():
    return _model is not None


def infer_waveform(mel, normalize=True,  batched=True, target=8000, overlap=800, 
                   progress_callback=None):
    """
    Infers the waveform of a mel spectrogram output by the synthesizer (the format must match 
    that of the synthesizer!)
    
    :param normalize:  
    :param batched: 
    :param target: 
    :param overlap: 
    :return: 
    """
    import sys
    if _model is None:
        raise Exception("Please load Wave-RNN in memory before using it")
    
    print(f"[Vocoder] Input mel-spectrogram shape: {mel.shape}")
    print(f"[Vocoder] Normalize: {normalize}, Batched: {batched}, Target: {target}, Overlap: {overlap}")
    print(f"[Vocoder] Device: {_device}, Model on: {next(_model.parameters()).device}")
    
    try:
        if normalize:
            mel = mel / hp.mel_max_abs_value
        mel = torch.from_numpy(mel[None, ...])
        print(f"[Vocoder] Mel tensor shape after processing: {mel.shape}, dtype: {mel.dtype}")
        
        print("[Vocoder] Starting waveform generation (this may take a while on CPU)...")
        sys.stdout.flush()
        
        wav = _model.generate(mel, batched, target, overlap, hp.mu_law, progress_callback)
        
        print(f"[Vocoder] Waveform generated successfully, shape: {wav.shape}")
        return wav
    except Exception as e:
        print(f"[Vocoder] ✗ Error during vocoding: {e}")
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        raise
