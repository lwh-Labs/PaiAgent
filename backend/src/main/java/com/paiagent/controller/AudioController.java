package com.paiagent.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 音频文件控制器
 * 提供 TTS 合成后音频文件的访问接口
 * 音频文件存储在系统临时目录下的 paiagent-audio 子目录中
 */
@Slf4j
@RestController
@RequestMapping("/api/audio")
public class AudioController {

    /**
     * 音频临时目录名称（与 TTSNodeHandler 中保持一致）
     */
    private static final String AUDIO_DIR = "paiagent-audio";

    /**
     * 获取音频文件
     * 从临时目录读取指定音频文件并以 audio/mpeg 格式返回
     *
     * @param filename 音频文件名（含扩展名，例如 abc123.mp3）
     * @return 音频文件字节流，若文件不存在则返回 404
     */
    @GetMapping("/{filename}")
    public ResponseEntity<byte[]> getAudio(@PathVariable String filename) {
        log.debug("请求音频文件: {}", filename);

        // 安全校验：防止路径遍历攻击
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            log.warn("非法音频文件名请求: {}", filename);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        // 构建文件路径
        String tmpDir = System.getProperty("java.io.tmpdir");
        Path filePath = Paths.get(tmpDir, AUDIO_DIR, filename);

        if (!Files.exists(filePath)) {
            log.warn("音频文件不存在: {}", filePath);
            return ResponseEntity.notFound().build();
        }

        try {
            byte[] audioData = Files.readAllBytes(filePath);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("audio/mpeg"));
            headers.setContentLength(audioData.length);
            // 允许浏览器缓存音频文件（1小时）
            headers.setCacheControl("public, max-age=3600");

            log.debug("返回音频文件, filename={}, size={}字节", filename, audioData.length);
            return new ResponseEntity<>(audioData, headers, HttpStatus.OK);

        } catch (IOException e) {
            log.error("读取音频文件失败, filename={}", filename, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
