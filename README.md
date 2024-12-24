# TONGYI-LLM

## 简介

`tongyi-llm` 是一个利用阿里云服务的项目，旨在通过阿里云的 API 接口实现特定的功能。本项目需要使用阿里云提供的 API Key 进行身份验证和权限控制。

## 环境配置

在开始之前，请确保你已经拥有阿里云账号，并能够访问 [阿里云控制台](https://bailian.console.aliyun.com/?apiKey=1#/api-key)。

### 步骤 1: 生成 API Key

1. 登录阿里云控制台。
2. 访问 [API Key 管理页面](https://bailian.console.aliyun.com/?apiKey=1#/api-key)。
3. 按照页面提示生成新的 API Key。请确保记录下生成的 API Key，因为出于安全考虑，生成后不会再次显示。

### 步骤 2: 替换 `.env` 文件中的 `TONGYI_API_KEY`

1. 在项目根目录下找到 `.env` 文件。
2. 打开 `.env` 文件，找到 `TONGYI_API_KEY` 变量。
3. 将 `TONGYI_API_KEY` 的值替换为你从阿里云控制台生成的 API Key。

   ```env
   # .env 文件示例
   TONGYI_API_KEY=your_generated_api_key_here
   ```

### 步骤 3: 启动项目

完成以上步骤后，你可以通过以下命令启动项目：

```bash
npm install
npm start
```

## 注意事项

- 请确保不要泄露你的 API Key，它应该被视为敏感信息。
- 定期检查和更新你的 API Key 以保持账户安全。
- 如果你在使用过程中遇到任何问题，可以参考阿里云官方文档或联系技术支持。

## 贡献

欢迎对 `llm-project` 进行贡献。如果你有任何改进建议或发现问题，请通过 GitHub Issues 提交。

## 许可证

本项目遵循 [MIT 许可证](LICENSE)。
