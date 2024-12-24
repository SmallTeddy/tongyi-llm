import OpenAI from 'openai';
import inquirer from 'inquirer';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.TONGYI_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

function formatMarkdownLine(text) {
  let isInCodeBlock = false;
  
  // 检查是否在代码块内
  if (text.includes('```')) {
    isInCodeBlock = !isInCodeBlock;
    return chalk.bgGray.white(text);
  }
  
  // 如果在代码块内，直接返回格式化的代码
  if (isInCodeBlock) {
    return chalk.bgGray.white(text);
  }

  // 处理行内代码
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    return ` ${chalk.white(code)} `;
  });
  
  // 处理标题 (支持多级标题)
  if (text.match(/^#{1,6}\s/)) {
    const level = text.match(/^#+/)[0].length;
    const title = text.slice(level).trim();
    const prefix = '#'.repeat(level);
    return '\n' + chalk.bold.hex('#4B9EF9')(`${prefix} ${title}`);
  }
  
  // 处理引用块
  if (text.startsWith('>')) {
    return chalk.gray.italic(text);
  }
  
  // 处理粗体
  text = text.replace(/\*\*([^*]+)\*\*/g, (_, content) => 
    chalk.bold(content));
  
  // 处理斜体
  text = text.replace(/\*([^*]+)\*/g, (_, content) => 
    chalk.italic(content));
  
  // 处理删除线
  text = text.replace(/~~([^~]+)~~/g, (_, content) => 
    chalk.strikethrough(content));
  
  // 处理链接
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => 
    chalk.blue.underline(text) + chalk.gray(` (${url})`));
  
  // 处理无序列表
  if (text.trim().match(/^[*-] /)) {
    return ' ' + chalk.yellow('•') + ' ' + text.replace(/^[*-] /, '');
  }
  
  // 处理有序列表
  if (text.trim().match(/^\d+\. /)) {
    const [number] = text.match(/^\d+/);
    return ' ' + chalk.yellow(number + '.') + text.replace(/^\d+\. /, ' ');
  }

  return text;
}

// 添加一个新的函数来处理代码块的累积
function createMarkdownFormatter() {
  let isInCodeBlock = false;
  let codeBlockLanguage = '';
  let codeBlockContent = '';
  const CODE_INDENT = '  '; // 代码块缩进
  
  // 创建竖线标记
  const createCodeBlockMarker = () => {
    return chalk.bold('｜') + ' '; // 使用全角竖线，后面加一个空格
  };
  
  return {
    format(text) {
      // 处理代码块的开始和结束
      if (text.includes('```')) {
        if (!isInCodeBlock) {
          isInCodeBlock = true;
          codeBlockLanguage = text.slice(3).trim();
          return '\n' + CODE_INDENT + createCodeBlockMarker() + chalk.magenta('```' + codeBlockLanguage);
        } else {
          isInCodeBlock = false;
          const result = CODE_INDENT + createCodeBlockMarker() + chalk.magenta('```') + '\n';
          codeBlockContent = '';
          return result;
        }
      }
      
      // 如果在代码块内
      if (isInCodeBlock) {
        codeBlockContent += text + '\n';
        return CODE_INDENT + createCodeBlockMarker() + chalk.white(text);
      }
      
      return formatMarkdownLine(text);
    },
    
    isInCodeBlock() {
      return isInCodeBlock;
    }
  };
}

async function chat() {
  try {
    let conversationHistory = [
      { role: 'system', content: 'You are a helpful assistant.' }
    ];
    
    console.log(chalk.blue('欢迎使用通义千问! 输入 "exit" 结束对话'));

    const markdownFormatter = createMarkdownFormatter();
    
    while (true) {
      const { query } = await inquirer.prompt([
        {
          type: 'input',
          name: 'query',
          message: chalk.green('你的问题:'),
          validate: (input) => {
            if (input.trim() === '') {
              return '问题不能为空';
            }
            return true;
          }
        }
      ]);

      if (query.toLowerCase() === 'exit') {
        console.log(chalk.yellow('感谢使用!'));
        break;
      }

      try {
        console.log(chalk.gray('正在思考...'));
        
        const messages = [
          ...conversationHistory,
          { role: 'user', content: query }
        ];

        let retries = 3;
        let fullResponse = '';
        
        while (retries > 0) {
          try {
            // 使用流式 API
            const stream = await openai.chat.completions.create({
              model: 'qwen-plus',
              messages: messages,
              temperature: 0.7,
              stream: true, // 启用流式输出
            });

            process.stdout.write(chalk.cyan('\n回答: \n'));
            
            let currentLine = '';
            
            // 处理流式响应
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                // 处理换行符
                if (content.includes('\n')) {
                  const lines = (currentLine + content).split('\n');
                  for (let i = 0; i < lines.length; i++) {
                    if (i < lines.length - 1) {
                      // 输出完整行
                      process.stdout.write(markdownFormatter.format(lines[i]) + '\n');
                    } else {
                      // 保存最后一行
                      currentLine = lines[i];
                    }
                  }
                } else {
                  currentLine += content;
                  // 只有不在代码块内时才立即输出
                  if (!markdownFormatter.isInCodeBlock()) {
                    process.stdout.write(markdownFormatter.format(content));
                  }
                }
                fullResponse += content;
              }
            }
            
            // 输出最后一行
            if (currentLine) {
              process.stdout.write(markdownFormatter.format(currentLine) + '\n');
            }
            
            console.log(chalk.gray('\n-------------------'));
            break;
          } catch (error) {
            retries--;
            if (retries === 0) throw error;
            console.log(chalk.yellow(`请求失败，正在重试... 剩余重试次数: ${retries}`));
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // 更新对话历史
        if (fullResponse) {
          conversationHistory.push(
            { role: 'user', content: query },
            { role: 'assistant', content: fullResponse }
          );
          
          // 保持对话历史在合理范围内
          if (conversationHistory.length > 10) {
            conversationHistory = [
              conversationHistory[0],
              ...conversationHistory.slice(-9)
            ];
          }
        }

      } catch (error) {
        console.error(chalk.red('API 调用错误:'), error.message);
        if (error.response) {
          console.error(chalk.red('错误详情:'), error.response.data);
        }
        console.log(chalk.gray('请尝试重新提问'));
      }
    }
  } catch (error) {
    console.error(chalk.red('程序初始化错误:'), error.message);
  }
}

// 添加全局错误处理
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('未处理的 Promise 错误:'), error);
});

chat().catch(error => {
  console.error(chalk.red('程序运行错误:'), error.message);
  process.exit(1);
}); 
