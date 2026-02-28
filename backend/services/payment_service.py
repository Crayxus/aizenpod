"""
微信支付服务 - Demo 占位
实际接入需要：商户号、API密钥、证书
"""


async def create_native_order(
    out_trade_no: str,
    amount_fen: int,
    description: str
) -> dict:
    """创建Native支付订单，返回二维码链接（Demo模式）"""
    # Demo: 直接返回模拟数据
    return {
        "code_url": f"weixin://wxpay/bizpayurl?demo={out_trade_no}",
        "out_trade_no": out_trade_no,
        "demo": True
    }


async def query_order(out_trade_no: str) -> dict:
    """查询订单状态（Demo模式自动返回成功）"""
    return {
        "trade_state": "SUCCESS",
        "out_trade_no": out_trade_no,
        "demo": True
    }
