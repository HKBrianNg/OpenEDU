# server-ai/src/games/jungle/nn_model.py
from pathlib import Path

MODEL_DIR = Path(__file__).parent / "models"


def list_available_models():
    """扫描 models/ 目录下的 .pth 文件，按修改时间倒序"""
    if not MODEL_DIR.exists():
        return []

    models = []
    for f in sorted(MODEL_DIR.glob("*.pth"), key=lambda x: x.stat().st_mtime, reverse=True):
        models.append({
            "name": f.stem,
            "filename": f.name,
            "size": f.stat().st_size,
            "modified": f.stat().st_mtime,
        })
    return models


def load_nn_model(model_name: str):
    """加载指定神经网络模型，当前返回 None（等待训练完成后实现）"""
    # TODO: 训练出模型后实现真正的加载
    return None