#!/bin/bash
# LatentSync 1.6 lip-sync job for one clip. Logs to /workspace/job.log
set -x
mkdir -p /workspace && cd /workspace && (nohup python3 -m http.server 8888 -d /workspace >/dev/null 2>&1 &)
exec > /workspace/job.log 2>&1
export DEBIAN_FRONTEND=noninteractive HF_HUB_ENABLE_HF_TRANSFER=0
apt-get update -qq && apt-get install -y -qq ffmpeg libgl1 libglib2.0-0 git >/dev/null
cd /workspace
curl -fsSL -o clip_in.mp4 https://gspot.world/_x/37509dfcfb54901d/clip_in.mp4
curl -fsSL -o voice16.wav https://gspot.world/_x/37509dfcfb54901d/voice16.wav
ls -la
[ -d LatentSync ] || git clone -q https://github.com/bytedance/LatentSync.git
cd LatentSync
pip install -q uv
uv venv -q -p 3.10 .venv
source .venv/bin/activate
uv pip install -q -r requirements.txt
uv pip install -q torch==2.7.1 torchvision==0.22.1 --index-url https://download.pytorch.org/whl/cu128
nvidia-smi --query-gpu=name,memory.total --format=csv
python -c "import torch;print('torch',torch.__version__,torch.cuda.is_available())"
huggingface-cli download ByteDance/LatentSync-1.6 whisper/tiny.pt --local-dir checkpoints
huggingface-cli download ByteDance/LatentSync-1.6 latentsync_unet.pt --local-dir checkpoints
ls -la checkpoints checkpoints/whisper
echo SETUP_DONE
python -m scripts.inference --unet_config_path configs/unet/stage2_512.yaml --inference_ckpt_path checkpoints/latentsync_unet.pt --inference_steps 25 --guidance_scale 1.5 --enable_deepcache --video_path /workspace/clip_in.mp4 --audio_path /workspace/voice16.wav --video_out_path /workspace/out.mp4
ls -la /workspace/out.mp4 && ffmpeg -y -v error -i /workspace/out.mp4 -vf scale=360:-2 -c:v libx264 -crf 28 -c:a aac -b:a 96k /workspace/preview.mp4
echo JOB_DONE
