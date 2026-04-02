using UnityEngine;
using UnityEngine.UI;

public class TeamWidget : MonoBehaviour
{
	[SerializeField]
	private Text m_name;

	[SerializeField]
	private Text m_score;

	[SerializeField]
	private Text m_scoreChange;

	[SerializeField]
	private ParticleSystem m_scoreChangeParticleSystem;

	private Animator m_animator;

	private Team m_team;

	private int m_cachedScore = -1;

	public void SetTeam(Team team)
	{
		m_team = team;
		m_cachedScore = 0;
		m_score.text = "0";
	}

	private void Awake()
	{
		m_animator = GetComponent<Animator>();
	}

	private void Update()
	{
		m_name.text = m_team.GetDisplayName();
		if (m_team.GetScore() != m_cachedScore)
		{
			m_score.text = m_team.GetScore().ToString();
			int num = m_team.GetScore() - m_cachedScore;
			m_animator.Play("Scored", -1, 0f);
			m_scoreChange.text = Utils.GetRandomArrayValue(Singleton<SystemGame>.Get.GetScoreText()) + " +" + num;
			m_scoreChangeParticleSystem.Play();
			m_cachedScore = m_team.GetScore();
		}
	}
}
