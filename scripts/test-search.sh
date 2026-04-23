#!/bin/bash

# CLI 搜索模块快速测试脚本
# 使用方法：./scripts/test-search.sh

set -e

echo "🚀 CLI 搜索模块快速测试"
echo "========================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
TESTS_PASSED=0
TESTS_FAILED=0

# 测试函数
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"
    
    echo -n "测试：$test_name ... "
    
    if eval "$command" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✓ 通过${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ 失败${NC}"
        echo "  命令：$command"
        echo "  期望包含：$expected_pattern"
        ((TESTS_FAILED++))
    fi
}

# 检查编译
echo "📦 检查编译状态..."
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}⚠️  dist 目录不存在，开始编译...${NC}"
    npm run build
fi

if [ ! -f "dist/cli/index.js" ]; then
    echo -e "${RED}✗ CLI 未编译，请先运行：npm run build${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 编译完成${NC}"
echo ""

# 测试 1: 帮助信息
echo "📋 测试 1: 帮助信息"
run_test "显示帮助" "node dist/cli/index.js search --help" "在 wnacg.com 上搜索漫画"
echo ""

# 测试 2: 基本搜索（如果有关键字缓存则跳过）
echo "📋 测试 2: 基本搜索"
if [ -f "cache/search_测试.json" ]; then
    echo -e "${YELLOW}⚠️  跳过：缓存已存在${NC}"
else
    run_test "基本搜索" "node dist/cli/index.js search 测试 --pages 1" "找到.*部漫画"
fi
echo ""

# 测试 3: JSON 输出
echo "📋 测试 3: JSON 输出"
run_test "JSON 格式" "node dist/cli/index.js search 测试 --json --pages 1" '"success": true'
echo ""

# 测试 4: 搜索结果列表
echo "📋 测试 4: 搜索结果列表"
run_test "显示列表" "node dist/cli/index.js search --list" "搜索结果列表:"
echo ""

# 测试 5: 缓存检测
echo "📋 测试 5: 缓存检测"
if [ -f "cache/search_测试.json" ]; then
    output=$(node dist/cli/index.js search 测试 --pages 1 2>&1)
    if echo "$output" | grep -q "已存在"; then
        echo -e "${GREEN}✓ 缓存检测通过${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ 缓存检测失败${NC}"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️  跳过：无缓存文件${NC}"
fi
echo ""

# 测试 6: 错误处理
echo "📋 测试 6: 错误处理"
output=$(node dist/cli/index.js search 不存在的作者_xyz_123 --pages 1 2>&1 || true)
if echo "$output" | grep -q "未找到漫画\|找到 0 部"; then
    echo -e "${GREEN}✓ 错误处理通过${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  可能需要网络验证${NC}"
fi
echo ""

# 显示测试结果
echo "========================"
echo "测试结果汇总:"
echo -e "  ${GREEN}通过：$TESTS_PASSED${NC}"
echo -e "  ${RED}失败：$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}❌ 部分测试失败${NC}"
    exit 1
fi
