"""Interface chung cho tất cả TTS adapter."""

from abc import ABC, abstractmethod
from pathlib import Path


class TTSBase(ABC):
    """Mỗi adapter kế thừa class này và implement synthesize()."""

    @abstractmethod
    def synthesize(self, text: str, output_path: Path) -> None:
        """
        Tổng hợp giọng nói từ text, lưu vào output_path (MP3).
        Raise exception nếu thất bại — caller sẽ thử adapter tiếp theo.
        """
        ...

    def name(self) -> str:
        return self.__class__.__name__
