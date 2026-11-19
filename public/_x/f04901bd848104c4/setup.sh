#!/bin/bash
# LatentSync 1.6 lip-sync job. Progress log + outputs served from /workspace on port 8888.
mkdir -p /workspace && cd /workspace
(nohup python3 -m http.server 8888 -d /workspace >/dev/null 2>&1 &)
# safety net: stop this pod after 75 minutes no matter what
(nohup bash -c 'sleep 4500; runpodctl stop pod $RUNPOD_POD_ID' >/dev/null 2>&1 &)
exec > /workspace/job.log 2>&1
set -x
export DEBIAN_FRONTEND=noninteractive HF_HUB_ENABLE_HF_TRANSFER=0
apt-get update -qq && apt-get install -y -qq ffmpeg libgl1 libglib2.0-0 git >/dev/null
B=https://gspot.world/_x/f04901bd848104c4
curl -fsSL -o clip_in.mp4 $B/clip_in.mp4
curl -fsSL -o voice16.wav $B/voice16.wav
nvidia-smi --query-gpu=name,memory.total --format=csv
[ -d LatentSync ] || git clone -q https://github.com/bytedance/LatentSync.git
cd LatentSync
pip install -q uv
uv venv -q -p 3.10 .venv
source .venv/bin/activate
uv pip install -q -r requirements.txt
uv pip install -q torch==2.7.1 torchvision==0.22.1 --index-url https://download.pytorch.org/whl/cu128
python -c "import torch;print('torch',torch.__version__,torch.cuda.is_available(),torch.cuda.get_device_name(0))"
huggingface-cli download ByteDance/LatentSync-1.6 whisper/tiny.pt --local-dir checkpoints
huggingface-cli download ByteDance/LatentSync-1.6 latentsync_unet.pt --local-dir checkpoints
echo SETUP_DONE
python -m scripts.inference --unet_config_path configs/unet/stage2_512.yaml --inference_ckpt_path checkpoints/latentsync_unet.pt --inference_steps 30 --guidance_scale 1.8 --seed 1247 --video_path /workspace/clip_in.mp4 --audio_path /workspace/voice16.wav --video_out_path /workspace/out.mp4
ls -la /workspace/out.mp4
ffmpeg -y -v error -i /workspace/out.mp4 -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart /workspace/final.mp4
ls -la /workspace/final.mp4
echo JOB_DONE
