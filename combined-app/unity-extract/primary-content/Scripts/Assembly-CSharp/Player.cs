using System;
using System.Collections;
using System.Collections.Generic;
using PowerTools;
using UnityEngine;

public class Player : MonoBehaviour
{
	public enum eState
	{
		Idle = 0,
		Run = 1,
		Pass = 2,
		Shoot = 3,
		Dodge = 4,
		Jump = 5,
		Fall = 6,
		Hit = 7,
		Dead = 8
	}

	private class AttachedEffect
	{
		public Vector3 m_offset = Vector3.zero;

		public Transform m_transform;
	}

	[Serializable]
	private class SpawnableEffect
	{
		public Vector3 m_offset = Vector3.zero;

		public GameObject m_prefab;

		public bool m_attached;
	}

	private static readonly float GROUND_HEIGHT = 0.01f;

	[SerializeField]
	private float m_moveSpeed = 10f;

	[SerializeField]
	private float m_maxHealth = 10f;

	[SerializeField]
	private GameObject m_sprite;

	[SerializeField]
	private Collider m_damageZone;

	[SerializeField]
	private Collider m_bodyCollider;

	[SerializeField]
	private float m_jumpImpulse;

	[SerializeField]
	private float m_jumpGravOffTime;

	[SerializeField]
	private float m_playerGravity = 9.8f;

	[SerializeField]
	private float m_jumpKickImpulse = 5f;

	[SerializeField]
	private float m_jumpShootImpulse = 5f;

	[SerializeField]
	private float m_kickSpeed = 20f;

	[SerializeField]
	private float m_kickAirSpeed = 20f;

	[SerializeField]
	private float m_shootSpeed = 20f;

	[SerializeField]
	private float m_dampenVelocityKick = 6f;

	[SerializeField]
	private float m_dampenVelocityKickAir = 20f;

	[SerializeField]
	private float m_dampenVelocityShoot = 6f;

	[SerializeField]
	private float m_dampenVelocityHit = 6f;

	[SerializeField]
	private float m_dodgeSpeed = 20f;

	[SerializeField]
	private float m_dampenVelocityDodge = 6f;

	[SerializeField]
	[Tooltip("Time after kicking before you can kick again")]
	private float m_kickCooldown;

	[SerializeField]
	[Tooltip("Time while kicking before you can dodge/jump")]
	private float m_kickInterruptTime;

	[Tooltip("Time while dodging before you can dodge again")]
	[SerializeField]
	private float m_dodgeCooldown;

	[Tooltip("Time while dodging before you can kick/pass/jump")]
	[SerializeField]
	private float m_dodgeInterruptTime;

	[SerializeField]
	private float m_healthRegenDuration = 5f;

	[SerializeField]
	private SpawnableEffect m_effectCall;

	[SerializeField]
	private AudioCue m_gruntSounds;

	[SerializeField]
	private AudioCue m_hitSound;

	[SerializeField]
	private AudioCue m_kickSounds;

	[SerializeField]
	private AudioCue m_shoeSounds;

	[SerializeField]
	private GameObject m_prefabPlayerFeetUI;

	private AnimStateMachine m_states;

	private SpriteAnimNodes m_animNodes;

	private ColorTinterBase m_tinter;

	private PlayerController m_playerController;

	private AIController m_AIController;

	private bool m_ai;

	private float m_health;

	private bool m_invincible;

	private Basketball m_ball;

	private Basketball m_receivingBall;

	private bool m_wasPassedBall;

	private float m_timeSinceGotBall;

	private Weapon m_weapon;

	private Vector3 m_velocity = Vector3.zero;

	private float m_dampenVelocity;

	private bool m_inputMoving;

	private Vector2 m_inputMove = Vector2.zero;

	private Vector2 m_inputMoveOverride = Vector2.zero;

	private Vector2 m_inputMoveDir = Vector2.right;

	private Vector2 m_inputMoveDirLocked = Vector2.right;

	private bool m_inAir;

	private float m_timeInAir;

	private bool m_allowFall = true;

	private bool m_ignoreInput;

	private float m_kickCooldownTimer;

	private float m_dodgeCooldownTimer;

	private Team m_team;

	private bool m_throwingIn;

	private bool m_throwingInPassDisabled;

	private List<AttachedEffect> m_attachedEffects = new List<AttachedEffect>();

	private PlayerFeetUI m_playerFeetUI;

	public Team GetTeam()
	{
		return m_team;
	}

	public void SetTeam(Team team, int playerNum)
	{
		m_team = team;
		m_inputMoveDir.x = team.GetAttackDirection();
		m_inputMoveDirLocked.x = team.GetAttackDirection();
		if (base.transform.position.x > 0f)
		{
			m_sprite.transform.localScale = m_sprite.transform.localScale.WithX(team.GetAttackDirection());
		}
		Team.TeamPlayer teamPlayer = m_team.GetTeamPlayers()[playerNum % m_team.GetTeamPlayers().Count];
		base.gameObject.name = teamPlayer.m_displayName;
		Team.TeamPlayerAnims playerAnims = teamPlayer.m_playerAnims;
		m_states.SetStateAnim("Idle", playerAnims.m_idle);
		m_states.SetStateAnim("Run", playerAnims.m_run);
		m_states.SetStateAnim("IdleBall", playerAnims.m_idle);
		m_states.SetStateAnim("RunBall", playerAnims.m_run);
		m_states.SetStateAnim("Pass", playerAnims.m_punch);
		m_states.SetStateAnim("Shoot", playerAnims.m_kick);
		m_states.SetStateAnim("Dodge", playerAnims.m_dodge);
		m_states.SetStateAnim("Jump", playerAnims.m_jump);
		m_states.SetStateAnim("Fall", playerAnims.m_fall);
		m_states.SetStateAnim("Hit", playerAnims.m_hit);
		m_states.SetStateAnim("Dead", playerAnims.m_dead);
		GameObject gameObject = UnityEngine.Object.Instantiate(m_prefabPlayerFeetUI);
		m_playerFeetUI = gameObject.GetComponent<PlayerFeetUI>();
		m_playerFeetUI.SetPlayer(this);
	}

	public void ShowName(float time)
	{
		m_playerFeetUI.ShowText(time);
	}

	public void AssignPlayerController(PlayerController controller)
	{
		m_playerController = controller;
		SetAI(false);
	}

	public PlayerController GetPlayerController()
	{
		return m_playerController;
	}

	public void SetAI(bool ai)
	{
		m_AIController.enabled = ai;
		m_ai = ai;
	}

	public bool GetIsAI()
	{
		return m_ai;
	}

	public bool GetAlive()
	{
		return !m_states.GetInState(eState.Dead);
	}

	public bool GetDead()
	{
		return m_states.GetInState(eState.Dead);
	}

	public float GetHealth()
	{
		return m_health;
	}

	public float GetMaxHealth()
	{
		return m_maxHealth;
	}

	public bool HasBall()
	{
		return m_ball != null;
	}

	public Vector3 GetBallNode()
	{
		return m_animNodes.GetNode(0).WithZ(base.transform.position.z - 0.01f);
	}

	public Vector3 GetBallSpriteNode()
	{
		Vector3 node = m_animNodes.GetNode(0);
		return node.WithZ(node.z - 0.15f);
	}

	public bool HasWeapon()
	{
		return m_weapon != null;
	}

	public Vector3 GetWeaponNode()
	{
		return m_animNodes.GetNode(2).WithZ(base.transform.position.z - 0.01f);
	}

	public Vector3 GetWeaponSpriteNode()
	{
		Vector3 node = m_animNodes.GetNode(2);
		return node.WithZ(node.z - 0.15f);
	}

	public Vector3 GetWeaponRotationNode()
	{
		return m_animNodes.GetNode(3);
	}

	public bool GetFlipped()
	{
		return m_sprite.transform.localScale.x < 0f;
	}

	public Vector3 GetPassToPoint()
	{
		return base.transform.position + new Vector3((!(m_inputMoveDir.x < 0f)) ? 0.2f : (-0.2f), 1.3f, 0f);
	}

	public bool GetThrowingIn()
	{
		return m_throwingIn;
	}

	public bool GetThrowingInPassDisabled()
	{
		return m_throwingInPassDisabled;
	}

	public bool CanTakeDamage()
	{
		if (m_throwingIn)
		{
			return false;
		}
		if (m_states.GetInState(eState.Hit) || GetDead())
		{
			return false;
		}
		if (m_invincible)
		{
			return false;
		}
		return true;
	}

	public bool TakeDamage(Transform source, float amount)
	{
		if (!CanTakeDamage())
		{
			return false;
		}
		Singleton<SystemGame>.Get.GetCamera().GetComponent<Shake>().StartShake(0.3f, 0.1f);
		SystemAudio.Play(m_hitSound);
		Vector3 vector = base.transform.position - source.position;
		m_velocity = vector.normalized * 20f;
		m_health -= amount;
		SystemAudio.Play(m_gruntSounds);
		if (m_health > 0f)
		{
			m_states.SetState(eState.Hit);
			if (m_inAir && m_ball != null)
			{
				Singleton<Commentary>.Get.PlayCommentary(Commentary.eCommentaryTrigger.BlockViolence);
			}
		}
		else
		{
			m_states.SetState(eState.Dead);
			Singleton<Commentary>.Get.PlayCommentary(Commentary.eCommentaryTrigger.Violence);
			m_inAir = true;
			m_timeInAir = 0f;
			m_velocity.y = m_jumpImpulse * 0.5f;
		}
		m_tinter.AddTint(Color.red, 0.2f);
		m_sprite.transform.localScale = m_sprite.transform.localScale.WithX(0f - Mathf.Sign(vector.x));
		if ((bool)m_ball)
		{
			DropBall();
		}
		if ((bool)m_weapon)
		{
			DropWeapon();
		}
		return true;
	}

	public Vector3 GetVelocity()
	{
		return m_velocity;
	}

	public bool GetInAir()
	{
		return m_inAir;
	}

	public void StartThrowIn(Basketball ball, float direction, Vector3 throwInPos)
	{
		StartCoroutine(CoroutineThrowIn(ball, direction, throwInPos));
	}

	public void SetInputMoveOverride(Vector2 direction)
	{
		m_inputMoveOverride = direction;
	}

	public void ResetInputMoveOverride()
	{
		m_inputMoveOverride = Vector2.zero;
	}

	public void OnGoal(Player scorer, bool dunk)
	{
		m_receivingBall = null;
		if (dunk && m_ball != null)
		{
			m_ball.Dunk();
			m_ball = null;
		}
	}

	private void Awake()
	{
		m_states = GetComponent<AnimStateMachine>();
		m_states.RegisterCallbacks(OnEnterState, OnExitState, UpdateState);
		m_health = m_maxHealth;
		m_animNodes = m_sprite.GetComponent<SpriteAnimNodes>();
		m_tinter = m_sprite.GetComponent<ColorTinterBase>();
		m_AIController = GetComponent<AIController>();
		m_damageZone.enabled = false;
	}

	private void Start()
	{
	}

	private void OnDestroy()
	{
		if (m_playerFeetUI != null)
		{
			UnityEngine.Object.Destroy(m_playerFeetUI.gameObject);
		}
		foreach (AttachedEffect attachedEffect in m_attachedEffects)
		{
			if (attachedEffect != null && attachedEffect.m_transform != null)
			{
				UnityEngine.Object.Destroy(attachedEffect.m_transform.gameObject);
			}
		}
	}

	private void OnEnterState(string oldState, string newState)
	{
		switch (m_states.GetState<eState>())
		{
		case eState.Pass:
			break;
		case eState.Shoot:
			UpdateInputMove(true);
			SetAttackVelocity();
			m_damageZone.enabled = true;
			m_ignoreInput = true;
			SystemAudio.Play(m_kickSounds);
			break;
		case eState.Dodge:
		{
			UpdateInputMove(true);
			Vector3 vector = m_inputMoveDirLocked.FromGameXYCoords();
			Vector3 vector2 = Vector2.Dot(m_velocity, vector) * vector;
			m_velocity -= vector2;
			bool flag = HasBall();
			m_velocity += vector * m_dodgeSpeed;
			m_dampenVelocity = m_dampenVelocityDodge;
			m_damageZone.enabled = false;
			m_ignoreInput = true;
			break;
		}
		case eState.Hit:
		case eState.Dead:
			m_ignoreInput = true;
			m_dampenVelocity = m_dampenVelocityHit;
			break;
		case eState.Jump:
		case eState.Fall:
			break;
		}
	}

	private void OnExitState(string oldState, string newState)
	{
		switch (m_states.GetState<eState>())
		{
		case eState.Shoot:
			m_damageZone.enabled = false;
			m_ignoreInput = false;
			m_dampenVelocity = 0f;
			break;
		case eState.Dodge:
			m_ignoreInput = false;
			m_dampenVelocity = 0f;
			break;
		case eState.Hit:
		case eState.Dead:
			m_ignoreInput = false;
			m_dampenVelocity = 0f;
			break;
		}
		AnimInvincibleOff();
	}

	private void Update()
	{
		m_kickCooldownTimer -= Time.deltaTime;
		m_dodgeCooldownTimer -= Time.deltaTime;
		if (HasBall())
		{
			m_timeSinceGotBall += Time.deltaTime;
		}
		else
		{
			m_timeSinceGotBall = 0f;
		}
		if (m_inAir)
		{
			m_timeInAir += Time.deltaTime;
		}
		if (GetAlive())
		{
			UpdateInputMove();
		}
		if (m_inAir)
		{
			if (m_timeInAir > m_jumpGravOffTime)
			{
				m_velocity.y -= m_playerGravity * Time.deltaTime;
				if (!m_allowFall && m_velocity.y < 0f)
				{
					m_velocity.y = 0f;
				}
			}
			if (m_velocity.y < 0f && base.transform.position.y <= GROUND_HEIGHT)
			{
				m_inAir = false;
				SystemAudio.Play(m_shoeSounds);
				m_velocity.y = 0f;
				base.transform.position = base.transform.position.WithY(GROUND_HEIGHT);
				if (m_states.GetInState(eState.Shoot))
				{
					ReturnToDefaultState();
				}
			}
		}
		else
		{
			if (!m_ignoreInput)
			{
				m_velocity = (m_inputMove * m_moveSpeed).FromGameXYCoords();
			}
			if (m_velocity.y > 0f)
			{
				m_inAir = true;
			}
		}
		if (m_dampenVelocity > 0f)
		{
			float y = m_velocity.y;
			m_velocity = Vector3.Lerp(m_velocity, Vector3.zero, m_dampenVelocity * Time.deltaTime);
			m_velocity.y = y;
		}
		if (m_damageZone.enabled)
		{
			m_damageZone.transform.position = m_animNodes.GetNode(1).WithZ(base.transform.position.z);
		}
		for (int num = m_attachedEffects.Count - 1; num >= 0; num--)
		{
			AttachedEffect attachedEffect = m_attachedEffects[num];
			if (attachedEffect.m_transform == null)
			{
				m_attachedEffects.RemoveAt(num);
			}
			else
			{
				attachedEffect.m_transform.position = base.transform.position + attachedEffect.m_offset;
			}
		}
		if ((bool)m_receivingBall && m_receivingBall.GetPlayerReceiving() != this)
		{
			m_receivingBall = null;
		}
	}

	private void FixedUpdate()
	{
		GetComponent<Rigidbody>().velocity = m_velocity;
	}

	private void LateUpdate()
	{
		m_sprite.GetComponent<SpriteRenderer>().sortingOrder = SystemGame.CalcSpriteDepth(base.transform.position);
	}

	private void UpdateState(string state)
	{
		switch (m_states.GetState<eState>())
		{
		case eState.Idle:
		case eState.Run:
			ReturnToDefaultState();
			UpdateKickPassButtons();
			if (GetInputJump())
			{
				Jump();
			}
			break;
		case eState.Jump:
		case eState.Fall:
			UpdateKickPassButtons();
			if (!m_inAir)
			{
				ReturnToDefaultState();
			}
			break;
		case eState.Shoot:
			if (m_states.GetStateTime() > m_kickInterruptTime)
			{
				bool flag2 = false;
				if (!flag2 && GetInputDodge())
				{
					flag2 = Dodge();
				}
				if (!flag2 && GetInputJump())
				{
					flag2 = Jump();
				}
			}
			break;
		case eState.Dodge:
			if (m_states.GetStateTime() > m_dodgeInterruptTime)
			{
				bool flag = false;
				if (!flag && GetInputPass())
				{
					flag = Pass();
				}
				if (!flag && HasBall() && GetInputShoot())
				{
					flag = Shoot();
				}
				if (!flag && GetInputShoot())
				{
					flag = Kick();
				}
				if (!flag && GetInputJump())
				{
					flag = Jump();
				}
			}
			break;
		case eState.Dead:
			m_health += m_maxHealth / m_healthRegenDuration * Time.deltaTime;
			if (m_health >= m_maxHealth)
			{
				m_health = m_maxHealth;
				m_states.SetState(eState.Idle);
			}
			break;
		case eState.Pass:
		case eState.Hit:
			break;
		}
	}

	private bool GetInputShoot()
	{
		return Singleton<SystemGame>.Get.GetIsPlaying() && ((!m_ai) ? m_playerController.Shoot.WasPressed : m_AIController.GetInputShoot());
	}

	private bool GetInputPass()
	{
		return Singleton<SystemGame>.Get.GetIsPlaying() && ((!m_ai) ? m_playerController.Pass.WasPressed : m_AIController.GetInputPass());
	}

	private bool GetInputCall()
	{
		return Singleton<SystemGame>.Get.GetIsPlaying() && ((!m_ai) ? m_playerController.Pass.WasPressed : m_AIController.GetInputPass());
	}

	private bool GetInputJump()
	{
		return Singleton<SystemGame>.Get.GetIsPlaying() && ((!m_ai) ? m_playerController.Jump.WasPressed : m_AIController.GetInputJump());
	}

	private bool GetInputDodge()
	{
		return Singleton<SystemGame>.Get.GetIsPlaying() && ((!m_ai) ? m_playerController.Dodge.WasPressed : m_AIController.GetInputDodge());
	}

	private void ReturnToDefaultState()
	{
		eState eState2 = eState.Idle;
		eState2 = (m_inAir ? eState.Fall : (m_inputMoving ? eState.Run : eState.Idle));
		if (!m_states.GetInState(eState2))
		{
			m_states.SetState(eState2);
		}
	}

	private void UpdateKickPassButtons()
	{
		if (HasBall())
		{
			if (GetInputShoot())
			{
				Shoot();
			}
			else if (GetInputPass())
			{
				Pass();
			}
			else if (GetInputDodge())
			{
				Dodge();
			}
		}
		else if (GetInputShoot())
		{
			Kick();
		}
		else if (GetInputCall())
		{
			Call();
		}
		else if (GetInputDodge())
		{
			Dodge();
		}
	}

	private void UpdateInputMove(bool force = false)
	{
		if (Singleton<SystemGame>.Get.GetIsPlaying())
		{
			if (m_ai)
			{
				m_inputMove = m_AIController.GetInputMove();
			}
			else if (m_playerController != null)
			{
				m_inputMove = m_playerController.Direction;
				m_inputMove.y = 0f - m_inputMove.y;
			}
		}
		else
		{
			m_inputMove = Vector2.zero;
		}
		if (m_inputMoveOverride != Vector2.zero)
		{
			m_inputMove = m_inputMoveOverride;
		}
		Vector2 vector = m_inputMove;
		float num = Utils.NormalizeMag(ref vector);
		if (num < 0.2f)
		{
			num = 0f;
			m_inputMoving = false;
			m_inputMove = Vector2.zero;
		}
		else
		{
			num = 1f;
			m_inputMoving = !m_ignoreInput;
			m_inputMove = vector;
			m_inputMoveDir = vector;
		}
		if ((!m_ignoreInput || force) && !m_inAir)
		{
			m_inputMoveDirLocked = m_inputMoveDir;
		}
		if (m_sprite.transform.localScale.x < 0f != m_inputMoveDir.x < 0f && !m_ignoreInput && !m_inAir)
		{
			m_sprite.transform.localScale = m_sprite.transform.localScale.WithX(Mathf.Sign(m_inputMoveDir.x));
			SystemAudio.Play(m_shoeSounds);
		}
	}

	private void OnTrigger(Collider collider)
	{
		if (collider.gameObject.layer == 11)
		{
			if (!Singleton<SystemGame>.Get.GetThrowInActive() || m_throwingIn || m_receivingBall != null)
			{
				Basketball component = collider.GetComponent<Basketball>();
				if (!m_states.GetInState(eState.Shoot) || !(component != null) || component.GetState() != Basketball.eState.Pass || !(component.GetPlayerReceiving() != null) || !(component.GetPlayerReceiving().GetTeam() != GetTeam()))
				{
					PickUpBall(component);
				}
			}
		}
		else if (collider.gameObject.layer == 15)
		{
			PickUpWeapon(collider.GetComponent<Weapon>());
		}
		if (m_damageZone.enabled && collider.gameObject.layer == 10)
		{
			Player componentInParent = collider.GetComponentInParent<Player>();
			if (componentInParent != null && componentInParent != this && componentInParent.GetAlive() && componentInParent.GetTeam() != m_team && componentInParent.CanTakeDamage())
			{
				m_velocity = Vector3.zero;
				componentInParent.TakeDamage(base.transform, 1f);
			}
		}
		if (collider.gameObject.layer == 17)
		{
			Weapon component2 = collider.gameObject.GetComponent<Weapon>();
			if (component2 != null && component2.CanDamage(this))
			{
				TakeDamage(collider.gameObject.transform, component2.GetDamage());
			}
		}
	}

	private void OnTriggerEnter(Collider collider)
	{
		OnTrigger(collider);
	}

	private void OnTriggerStay(Collider collider)
	{
		OnTrigger(collider);
	}

	private void OnCollisionEnter(Collision collision)
	{
		GameObject gameObject = collision.collider.gameObject;
		if (gameObject.layer == 17)
		{
			Weapon component = gameObject.GetComponent<Weapon>();
			if (component != null && component.CanDamage(this))
			{
				TakeDamage(gameObject.transform, component.GetDamage());
			}
		}
	}

	private bool PickUpBall(Basketball ball)
	{
		if (ball == null)
		{
			return false;
		}
		if (!ball.CanPickUp(this))
		{
			return false;
		}
		if (HasBall())
		{
			return false;
		}
		if (m_states.GetInState(eState.Pass) || m_states.GetInState(eState.Hit) || m_states.GetInState(eState.Dead) || m_states.GetInState(eState.Shoot))
		{
			return false;
		}
		m_ball = ball;
		ball.PickUp(this);
		m_wasPassedBall = m_receivingBall == ball;
		m_receivingBall = null;
		DropWeapon();
		return true;
	}

	public bool CanRecievePass()
	{
		return GetAlive() && m_ball == null;
	}

	public bool RecievePass(Basketball ball)
	{
		m_receivingBall = ball;
		return true;
	}

	public bool GetReceivingPass()
	{
		return m_receivingBall != null && m_receivingBall.GetState() == Basketball.eState.Pass;
	}

	private void DropBall()
	{
		Vector2 vector = UnityEngine.Random.insideUnitSphere * UnityEngine.Random.Range(0, 8);
		vector.y = UnityEngine.Random.Range(5, 10);
		DropBall(vector);
	}

	private void DropBall(Vector3 velocity)
	{
		if (!(m_ball == null) && !m_throwingIn)
		{
			Singleton<Commentary>.Get.PlayCommentary(Commentary.eCommentaryTrigger.ChangePossession);
			m_ball.Drop(velocity);
			m_ball = null;
		}
	}

	private bool Pass()
	{
		if (m_ball == null)
		{
			return false;
		}
		if (m_throwingInPassDisabled)
		{
			return false;
		}
		m_states.SetState(eState.Pass);
		return true;
	}

	private void AnimPass()
	{
		if (m_ball == null || m_throwingInPassDisabled)
		{
			return;
		}
		Player player = null;
		foreach (Player player2 in m_team.GetPlayers())
		{
			if (player2 != this && (player2.CanRecievePass() || GetThrowingIn()))
			{
				player = player2;
			}
		}
		if (player == null)
		{
			Vector3 direction = m_inputMoveDir.FromGameXYCoords();
			direction.y = 0.5f;
			m_ball.Pass(direction);
		}
		else
		{
			m_ball.Pass(player);
		}
		if (player != null)
		{
			player.RecievePass(m_ball);
		}
		m_ball = null;
	}

	private bool Dodge()
	{
		if (m_throwingIn || m_dodgeCooldownTimer > 0f || m_inAir)
		{
			return false;
		}
		m_dodgeCooldownTimer = m_dodgeCooldown;
		m_states.SetState(eState.Dodge);
		return true;
	}

	private bool OnOtherPlayerCalled(Player otherPlayer)
	{
		if (m_throwingInPassDisabled)
		{
			return false;
		}
		if (m_ball == null || otherPlayer.GetTeam() != m_team)
		{
			return false;
		}
		if (m_ai)
		{
			m_ball.Pass(otherPlayer);
			if (otherPlayer != null)
			{
				otherPlayer.RecievePass(m_ball);
			}
			m_states.SetState(eState.Pass);
			return true;
		}
		return false;
	}

	private void SetAttackVelocity()
	{
		Vector3 vector = m_inputMoveDirLocked.FromGameXYCoords();
		Vector3 vector2 = Vector2.Dot(m_velocity, vector) * vector;
		m_velocity -= vector2;
		bool flag = HasBall();
		m_velocity += vector * (flag ? m_shootSpeed : ((!m_inAir) ? m_kickSpeed : m_kickAirSpeed));
		float num = ((!flag) ? m_jumpKickImpulse : m_jumpShootImpulse);
		if (m_inAir && m_velocity.y < num)
		{
			m_velocity.y = num;
		}
		if (flag && m_dampenVelocityShoot > 0f)
		{
			m_dampenVelocity = m_dampenVelocityShoot;
		}
		else if (!m_inAir && m_dampenVelocityKick > 0f)
		{
			m_dampenVelocity = m_dampenVelocityKick;
		}
		else if (m_inAir && m_dampenVelocityKickAir > 0f)
		{
			m_dampenVelocity = m_dampenVelocityKickAir;
		}
	}

	private bool Kick()
	{
		if (m_throwingIn || m_kickCooldownTimer > 0f)
		{
			return false;
		}
		m_kickCooldownTimer = m_kickCooldown;
		m_states.SetState(eState.Shoot);
		ThrowWeapon();
		return true;
	}

	private bool Shoot()
	{
		if (m_ball == null || (!m_wasPassedBall && m_timeSinceGotBall < 0.15f) || m_kickCooldownTimer > 0f)
		{
			return false;
		}
		if (m_throwingIn)
		{
			return false;
		}
		m_states.SetState(eState.Shoot);
		return true;
	}

	private void AnimShoot()
	{
		if (!(m_ball == null) && (m_wasPassedBall || !(m_timeSinceGotBall < 0.15f)) && !(m_kickCooldownTimer > 0f) && !m_throwingIn)
		{
			Hoop attackHoop = m_team.GetAttackHoop();
			m_ball.Shoot(attackHoop.GetBackboard().position);
			if (m_ball.GetShootDistance() > Singleton<SystemGame>.Get.m_threePointDistance)
			{
				Singleton<Commentary>.Get.PlayCommentary(Commentary.eCommentaryTrigger.JumpshotAttemptThree);
			}
			else
			{
				Singleton<Commentary>.Get.PlayCommentary(Commentary.eCommentaryTrigger.JumpshotAttemptTwo);
			}
			m_ball = null;
		}
	}

	private bool Call()
	{
		if (m_throwingIn)
		{
			return false;
		}
		if (m_ball != null)
		{
			return false;
		}
		SpawnEffect(m_effectCall);
		Player teamMate = GetTeamMate();
		if (teamMate != null)
		{
			return teamMate.OnOtherPlayerCalled(this);
		}
		return false;
	}

	private bool Jump()
	{
		if (m_throwingIn || m_inAir)
		{
			return false;
		}
		m_states.SetState(eState.Jump);
		m_inAir = true;
		m_timeInAir = 0f;
		m_velocity += Vector3.up * m_jumpImpulse;
		if (m_ball != null && m_ball.GetShootDistance() < Singleton<SystemGame>.Get.m_threePointDistance)
		{
			Singleton<Commentary>.Get.PlayCommentary(Commentary.eCommentaryTrigger.DunkAttempt);
		}
		return true;
	}

	private bool PickUpWeapon(Weapon weapon)
	{
		if (weapon == null)
		{
			return false;
		}
		if (!weapon.CanPickUp(this))
		{
			return false;
		}
		if (HasWeapon() || HasBall())
		{
			return false;
		}
		if (m_states.GetInState(eState.Hit) || m_states.GetInState(eState.Dead) || m_states.GetInState(eState.Shoot) || m_states.GetInState(eState.Pass))
		{
			return false;
		}
		m_weapon = weapon;
		weapon.PickUp(this);
		return true;
	}

	private void DropWeapon()
	{
		Vector2 vector = UnityEngine.Random.insideUnitSphere * UnityEngine.Random.Range(0, 10);
		vector.y = UnityEngine.Random.Range(8, 12);
		DropWeapon(vector);
	}

	private void DropWeapon(Vector3 velocity)
	{
		if (!(m_weapon == null))
		{
			m_weapon.Drop(velocity);
			m_weapon = null;
		}
	}

	private void ThrowWeapon()
	{
		if (m_weapon == null)
		{
			return;
		}
		UpdateInputMove();
		float num = Mathf.Cos((float)Math.PI / 180f * Singleton<Constants>.Get.m_weaponThrowTargetAngleRange);
		Player player = null;
		float num2 = float.MaxValue;
		foreach (Player player2 in Singleton<SystemGame>.Get.GetPlayers())
		{
			if (player2 != this && player2.GetTeam() != GetTeam() && player2.GetAlive())
			{
				Vector2 vector = player2.transform.position.ToGameXYCoords() - base.transform.position.ToGameXYCoords();
				float num3 = Utils.NormalizeMag(ref vector);
				float num4 = Vector2.Dot(vector, m_inputMoveDir);
				float num5 = Mathf.Acos(num4) * 57.29578f;
				num3 += num5 * Singleton<Constants>.Get.m_weaponThrowAngleDistFactor;
				if (num4 > num && num3 < num2)
				{
					player = player2;
					num2 = num3;
				}
			}
		}
		if (player == null)
		{
			Vector3 direction = m_inputMoveDir.FromGameXYCoords();
			m_weapon.Throw(direction, 6f);
		}
		else
		{
			m_weapon.Throw(player);
		}
		m_weapon = null;
	}

	private Player GetTeamMate()
	{
		return m_team.GetPlayers().Find((Player item) => item != this && item.m_team == m_team);
	}

	private void SpawnEffect(SpawnableEffect effect)
	{
		GameObject gameObject = UnityEngine.Object.Instantiate(effect.m_prefab, base.transform.position + effect.m_offset, effect.m_prefab.transform.rotation) as GameObject;
		if (effect.m_attached)
		{
			m_attachedEffects.Add(new AttachedEffect
			{
				m_offset = effect.m_offset,
				m_transform = gameObject.transform
			});
		}
	}

	private IEnumerator CoroutineThrowIn(Basketball ball, float direction, Vector3 throwInPos)
	{
		m_throwingIn = true;
		m_throwingInPassDisabled = true;
		m_health = Mathf.Max(0.1f, m_health);
		ReturnToDefaultState();
		m_bodyCollider.enabled = false;
		while (m_ball == null)
		{
			SetInputMoveOverride((ball.transform.position - base.transform.position).normalized.ToGameXYCoords());
			yield return new WaitForEndOfFrame();
		}
		SetInputMoveOverride(new Vector2(direction, 0f));
		while ((!(direction < 0f)) ? (base.transform.position.x < throwInPos.x) : (base.transform.position.x > throwInPos.x))
		{
			yield return new WaitForEndOfFrame();
		}
		ResetInputMoveOverride();
		m_ignoreInput = true;
		m_velocity = Vector2.zero;
		if (m_sprite.transform.localScale.x < 0f != 0f - direction < 0f)
		{
			m_sprite.transform.localScale = m_sprite.transform.localScale.WithX(Mathf.Sign(0f - direction));
		}
		SystemAudio.Play(Singleton<SystemGame>.Get.GetSoundThrowUp());
		Singleton<SystemGame>.Get.GetPlayers().ForEach(delegate(Player item)
		{
			item.ShowName(3f);
		});
		m_throwingInPassDisabled = false;
		float timer = 0f;
		while (m_ball != null)
		{
			yield return new WaitForEndOfFrame();
			timer += Time.deltaTime;
			if (timer > 5f)
			{
				SystemAudio.Play(Singleton<SystemGame>.Get.GetSoundThrowUp());
				yield return new WaitForSeconds(0.3f);
				Pass();
			}
		}
		m_ignoreInput = false;
		SetInputMoveOverride(new Vector2(0f - direction, 0f));
		while ((!(direction < 0f)) ? (base.transform.position.x > throwInPos.x - 3f) : (base.transform.position.x < throwInPos.x + 3f))
		{
			yield return new WaitForEndOfFrame();
		}
		ResetInputMoveOverride();
		m_bodyCollider.enabled = true;
		m_throwingIn = false;
	}

	private void AnimSound(GameObject sound)
	{
		if (sound != null)
		{
			SystemAudio.Play(sound.GetComponent<AudioCue>());
		}
	}

	private void AnimBounce()
	{
		if (HasBall() && Singleton<SystemGame>.Get.GetIsPlaying())
		{
			SystemAudio.Play(Singleton<Constants>.Get.m_soundBounce);
		}
	}

	private void AnimInvincibleOn()
	{
		m_invincible = true;
	}

	private void AnimInvincibleOff()
	{
		m_invincible = false;
	}
}
