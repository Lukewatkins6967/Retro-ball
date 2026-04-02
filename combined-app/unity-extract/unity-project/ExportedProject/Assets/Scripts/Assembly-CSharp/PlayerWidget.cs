using UnityEngine;
using UnityEngine.UI;

public class PlayerWidget : MonoBehaviour
{
	[SerializeField]
	private Text m_name;

	[SerializeField]
	private FillBar m_healthBar;

	private Player m_player;

	public void SetPlayer(Player player)
	{
		m_player = player;
		m_name.text = m_player.name;
		m_healthBar.GetFillImage().color = m_player.GetTeam().GetColor();
	}

	private void Update()
	{
		m_healthBar.SetFill(m_player.GetHealth() / m_player.GetMaxHealth());
	}
}
